//! Handlers WASM (Tier 2) del módulo `inventory` — las dos operaciones **batch**:
//!
//! * `bulk_create` — alta de N productos (cap 100, igual que el legacy
//!   `ProductService.bulk_create_products`). Genera SKU `PROD-{n:03d}` cuando la
//!   línea no trae sku (continúa la numeración con `existing_count` que el host
//!   pasa en el payload).
//! * `receive_stock` — recepción de mercancía: incrementa stock de productos
//!   existentes por línea (cap 200, `ProductService.receive_stock`). El casado
//!   por sku no se puede hacer en el guest (no toca BD), así que el host/SDK
//!   resuelve sku→product_id antes; el handler emite una op por línea con id.
//!
//! Lógica pura (sin BD): recibe `{payload, context}`, devuelve **intenciones**
//! (ops SQL por nombre de command del mismo módulo + params) que el host valida
//! y ejecuta en una transacción. Los ids de filas nuevas salen de
//! `context.new_ids` (el host es la autoridad de ids; el guest los reparte).

use erplora_guest_sdk::{Event, Operation, Output};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};

#[cfg(feature = "guest")]
use extism_pdk::*;

/// Domain error of a guest output (ADR-0205 wire contract, hub#139): a stable, namespaced
/// `code` (`inventory.<snake_case>`) the UI translates, plus an English source `message`
/// (max 500 chars) as fallback. Local mirror of `erplora_guest_sdk::DomainError` — the hub
/// checkout this crate builds against may predate the SDK type; the JSON wire shape
/// (`error: {code, message}`) is the actual ABI, so the mirror stays compatible either way.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DomainError {
    pub code: String,
    pub message: String,
}

impl DomainError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        DomainError { code: code.into(), message: message.into() }
    }
}

/// Guest output with the ADR-0205 `error` channel. Wire-compatible superset of
/// [`erplora_guest_sdk::Output`]:
///  * on an ADR-0205 runtime, `error` is checked BEFORE operations/events — nothing persists
///    and the caller gets HTTP 409 `{code, message}`;
///  * on an older runtime the unknown `error` field is ignored by serde and the empty
///    `operations` make the command a clean no-op — same silent outcome as before, never worse.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
pub struct HandlerOutput {
    #[serde(default)]
    pub operations: Vec<Operation>,
    #[serde(default)]
    pub events: Vec<Event>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<DomainError>,
}

impl HandlerOutput {
    /// A business rejection: no operations, no events, just the domain error.
    fn rejected(code: &str, message: String) -> Self {
        HandlerOutput { error: Some(DomainError::new(code, message)), ..Default::default() }
    }

    /// A benign no-op (e.g. `track_stock = 0`): nothing to do, and NOT an error.
    fn noop() -> Self {
        HandlerOutput::default()
    }
}

/// Alta batch de productos. Exporta `bulk_create`.
#[cfg(feature = "guest")]
#[plugin_fn]
pub fn bulk_create(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(bulk_create_pure(input.into_inner().into_value())))
}

/// Single-product stock decrease. Exports `decrease_stock`.
/// `Err` (a WASM trap) stays reserved for broken-contract payloads (missing product_id,
/// off-grid quantity — loud on every runtime); business rejections travel as
/// `HandlerOutput.error` (ADR-0205 domain channel).
#[cfg(feature = "guest")]
#[plugin_fn]
pub fn decrease_stock(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<HandlerOutput>> {
    match decrease_stock_pure(input.into_inner().into_value()) {
        Ok(out) => Ok(Json(out)),
        Err(e) => Err(Error::msg(e).into()),
    }
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn receive_stock(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(receive_stock_pure(input.into_inner().into_value())))
}

/// Listener WASM de `sale.completed`: descuenta stock por línea. Exporta `decrease_on_sale`.
#[cfg(feature = "guest")]
#[plugin_fn]
pub fn decrease_on_sale(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(decrease_on_sale_pure(input.into_inner().into_value())))
}

const MAX_BULK: usize = 100;
const MAX_RECEIVE: usize = 200;

fn as_str(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

fn as_i64(v: &Value, default: i64) -> i64 {
    match v {
        // Cae a f64 si el número viene como float (p.ej. quantity 3.0 del evento
        // sale.completed): as_i64() de serde devuelve None para floats no enteros.
        Value::Number(n) => n
            .as_i64()
            .or_else(|| n.as_f64().map(|f| f as i64))
            .unwrap_or(default),
        Value::String(s) => s.trim().parse::<i64>().ok().or_else(|| s.trim().parse::<f64>().ok().map(|f| f as i64)).unwrap_or(default),
        _ => default,
    }
}

/// Cantidad en PUNTO FIJO, escala global 10⁶ (ADR-0147). Un entero: 0,5 kg es `500000`.
///
/// Sustituye a `as_qty` (#10), que redondeaba a 3 decimales sobre `f64`. Aquello tapaba el truncado
/// (`as_i64(0.5)` = 0, que hacía que vender al peso no descontara stock en silencio) pero dejaba la
/// coma flotante dentro del contrato, y con ella `2.675 == 2.6749999999999998`.
///
/// Un decimal que llegue hasta aquí es un error de quien llama —la conversión va en la frontera,
/// donde el humano teclea—, así que el esquema lo declara `integer` y esto no lo repesca.
fn as_qty(v: &Value) -> i64 {
    match v {
        Value::Number(n) => n.as_i64().unwrap_or(0),
        Value::String(s) => s.trim().parse::<i64>().unwrap_or(0),
        _ => 0,
    }
}

fn opt_str(item: &Value, key: &str) -> Value {
    match item.get(key) {
        Some(Value::Null) | None => Value::Null,
        Some(v) => Value::String(as_str(v)),
    }
}

fn payload_context(input: &Value) -> (Value, Vec<Value>) {
    let payload = input.get("payload").cloned().unwrap_or(Value::Null);
    let empty: Vec<Value> = Vec::new();
    let new_ids = input
        .get("context")
        .and_then(|c| c.get("new_ids"))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or(empty);
    (payload, new_ids)
}

/// Lógica pura de `bulk_create`.
pub fn bulk_create_pure(input: Value) -> Output {
    let (payload, new_ids) = payload_context(&input);
    let empty: Vec<Value> = Vec::new();
    let products = payload.get("products").and_then(|v| v.as_array()).unwrap_or(&empty);
    // Contador de productos existentes para continuar la secuencia PROD-NNN.
    let existing = payload.get("existing_count").map(|v| as_i64(v, 0)).unwrap_or(0);

    let mut ops: Vec<Operation> = Vec::new();
    for (i, item) in products.iter().take(MAX_BULK).enumerate() {
        let sku = {
            let s = as_str(item.get("sku").unwrap_or(&Value::Null));
            if s.is_empty() {
                format!("PROD-{:03}", existing + i as i64 + 1)
            } else {
                s
            }
        };
        let product_id = new_ids.get(i).cloned().unwrap_or(Value::Null);
        let ptype = {
            let t = as_str(item.get("product_type").unwrap_or(&Value::Null));
            if t.is_empty() { "physical".to_string() } else { t }
        };
        let mut p = Map::new();
        p.insert("product_id".into(), product_id);
        p.insert("name".into(), json!(as_str(item.get("name").unwrap_or(&Value::Null))));
        p.insert("sku".into(), json!(sku));
        p.insert("ean13".into(), opt_str(item, "ean13"));
        p.insert("description".into(), json!(as_str(item.get("description").unwrap_or(&Value::Null))));
        p.insert("product_type".into(), json!(ptype));
        p.insert("price".into(), item.get("price").cloned().unwrap_or(json!(0)));
        p.insert("cost".into(), item.get("cost").cloned().unwrap_or(json!(0)));
        p.insert("stock".into(), item.get("stock").cloned().unwrap_or(json!(0)));
        p.insert(
            "low_stock_threshold".into(),
            item
                .get("low_stock_threshold")
                .cloned()
                .unwrap_or(json!(10_000_000)),
        );
        p.insert("tax_category_key".into(), opt_str(item, "tax_category_key"));
        p.insert("image".into(), json!(as_str(item.get("image").unwrap_or(&Value::Null))));
        // inventory#48: per-product tracking flag; absent = NULL = follow the hub setting.
        p.insert("track_stock".into(), track_stock_flag(item.get("track_stock")));
        ops.push(Operation::sql("inventory._insert_product", p));
    }
    Output { operations: ops, events: vec![], ..Default::default() }
}

/// Lógica pura de `receive_stock`. Cada línea debe traer `product_id` (resuelto
/// por el SDK/host desde sku si hiciera falta) y `qty` > 0; `unit_cost` opcional.
pub fn receive_stock_pure(input: Value) -> Output {
    let (payload, _ids) = payload_context(&input);
    let empty: Vec<Value> = Vec::new();
    let items = payload.get("items").and_then(|v| v.as_array()).unwrap_or(&empty);
    // Referencia del documento (albarán) — viaja a cada línea para el movimiento (#7).
    let reference = payload.get("reference").cloned().unwrap_or(Value::Null);

    let mut ops: Vec<Operation> = Vec::new();
    for item in items.iter().take(MAX_RECEIVE) {
        let qty = as_qty(item.get("qty").unwrap_or(&Value::Null)); // escala 10⁶ (ADR-0147)
        let product_id = item.get("product_id").cloned().unwrap_or(Value::Null);
        if qty <= 0 || product_id.is_null() {
            continue; // líneas inválidas se omiten (el legacy las reporta; aquí se saltan)
        }
        let mut p = Map::new();
        p.insert("product_id".into(), product_id);
        p.insert("qty".into(), json!(qty));
        p.insert("unit_cost".into(), item.get("unit_cost").cloned().unwrap_or(Value::Null));
        p.insert("reference".into(), reference.clone());
        ops.push(Operation::sql("inventory._receive_line", p));
    }
    Output { operations: ops, events: vec![], ..Default::default() }
}

/// Rows of a pre-loaded read (`context.reads[query]`, ADR-0069). `None` when the read is
/// ABSENT (old manifest or a degraded query — the handler defers to the SQL guards);
/// `Some(rows)` when present, even empty: the rows are the hub's catalog of trust and the
/// handler enforces against them.
fn read_rows<'a>(input: &'a Value, query: &str) -> Option<&'a Vec<Value>> {
    input.get("context")?.get("reads")?.get(query)?.as_array()
}

/// Stock-control settings of the hub, from `context.reads["inventory.settings.get"]`.
struct StockSettings {
    track: bool,
    allow_oversell: bool,
}

/// `None` = read absent → degrade (SQL stays the single authority). A present-but-empty read
/// (fresh hub without a settings row) resolves to the schema defaults: track on, oversell off.
fn stock_settings(input: &Value) -> Option<StockSettings> {
    let rows = read_rows(input, "inventory.settings.get")?;
    let row = rows.first();
    Some(StockSettings {
        track: row
            .and_then(|r| r.get("track_stock"))
            .map(|v| as_i64(v, 1) != 0)
            .unwrap_or(true),
        allow_oversell: row
            .and_then(|r| r.get("allow_sell_without_stock"))
            .map(|v| as_i64(v, 0) != 0)
            .unwrap_or(false),
    })
}

/// `track_stock` of the hub settings, pre-loaded by the host (ADR-0069; the manifest declares
/// `reads`). Without reads (old manifest or a degraded query) it degrades to `true` — the
/// final authoritative guard lives in the SQL of `stock.decrease` (inventory#6).
fn track_stock_enabled(input: &Value) -> bool {
    stock_settings(input).map(|s| s.track).unwrap_or(true)
}

/// A per-product `track_stock` value as it travels on the wire (inventory#48): `0`/`1` when the
/// row (or the caller) says so, `Null` when it is unset — the tri-state of ADR-0210, where NULL
/// means "follow the hub setting", never "unknown".
fn track_stock_flag(v: Option<&Value>) -> Value {
    match v {
        None | Some(Value::Null) => Value::Null,
        Some(Value::Bool(b)) => json!(if *b { 1 } else { 0 }),
        Some(other) => json!(if as_i64(other, 1) != 0 { 1 } else { 0 }),
    }
}

/// Effective tracking of ONE product row (inventory#48): the product's own flag when set,
/// otherwise the hub setting (`hub_default`). Services never track stock.
fn product_tracks_stock(product: &Value, hub_default: bool) -> bool {
    if product.get("product_type").map(as_str).unwrap_or_default() == "service" {
        return false;
    }
    match track_stock_flag(product.get("track_stock")) {
        Value::Null => hub_default,
        v => as_i64(&v, 1) != 0,
    }
}

/// The sale catalogue pre-loaded by the host (`context.reads["inventory.products.for_sale"]`,
/// sales#68 shape) indexed by product id. `None` when the read is absent — the handler then
/// defers to the SQL WHERE, which carries the same per-product guard.
fn catalog_by_id(input: &Value) -> Option<Map<String, Value>> {
    let rows = read_rows(input, "inventory.products.for_sale")?;
    let mut by_id = Map::new();
    for row in rows {
        if let Some(id) = row.get("id") {
            by_id.insert(as_str(id), row.clone());
        }
    }
    Some(by_id)
}

/// Lógica pura del listener de `sale.completed`: por cada línea con product_id
/// que NO sea servicio, emite una op `inventory.stock.decrease` (product_id, qty).
/// El payload del evento (lo emite sales) trae `sale_id` + `items: [{product_id,
/// quantity, is_service}]`. Fiel a inventory.events._on_sale_completed (saltaba
/// servicios y product_id None).
///
/// Modos operativos (inventory#6): con `track_stock = 0` NO se genera ningún
/// descuento; en su lugar se emite `inventory._skip_void_restock` — siembra el
/// marcador de `inventory_void_restock` para que un `sale.voided` posterior NO
/// restituya una venta que nunca descontó (criterio: revertir solo cuando la
/// operación original generó movimientos).
pub fn decrease_on_sale_pure(input: Value) -> Output {
    let (payload, _ids) = payload_context(&input);
    let empty: Vec<Value> = Vec::new();
    let items = payload.get("items").and_then(|v| v.as_array()).unwrap_or(&empty);
    // Reference to the source document (#7): the `sale` ledger movement records it.
    let sale_id = payload.get("sale_id").cloned().unwrap_or(Value::Null);
    let hub_tracks = track_stock_enabled(&input);
    // inventory#48: tracking is decided PER ARTICLE. The pre-loaded catalogue (`for_sale`)
    // projects the effective flag; a line whose product opted out is skipped here (and the SQL
    // WHERE of `_decrease_stock` skips it again, authoritatively). Without the read the handler
    // defers to the SQL for the per-product guard and keeps the hub-level fast-path.
    let catalog = catalog_by_id(&input);
    let line_tracks = |product_id: &Value| -> bool {
        match &catalog {
            Some(by_id) => by_id
                .get(&as_str(product_id))
                .map(|row| product_tracks_stock(row, hub_tracks))
                .unwrap_or(hub_tracks),
            None => hub_tracks,
        }
    };
    let any_line_tracks = items.iter().any(|it| {
        it.get("product_id").map(|id| !id.is_null() && line_tracks(id)).unwrap_or(false)
    });
    if !hub_tracks && !any_line_tracks {
        let mut ops: Vec<Operation> = Vec::new();
        if !sale_id.is_null() {
            let mut p = Map::new();
            p.insert("sale_id".into(), sale_id);
            ops.push(Operation::sql("inventory._skip_void_restock", p));
        }
        return Output { operations: ops, events: vec![], ..Default::default() };
    }
    // A handler's ops may only reference SQL commands of its OWN module (§5.3): pointing at the
    // WASM command `inventory.stock.decrease` resolved to ZERO statements and the event-driven
    // decrease silently never happened. Since #6, ledger movement + stock UPDATE are ONE atomic
    // statement (`inventory._decrease_stock`, a data-modifying CTE) so the ledger cannot record
    // a decrease that did not apply (ghost row under concurrency). The increment grid was
    // already validated by `sales` at checkout (frozen context); the authoritative mode guard
    // lives in the SQL WHERE.
    let mut ops: Vec<Operation> = Vec::new();
    for it in items {
        let is_service = match it.get("is_service") {
            Some(Value::Bool(b)) => *b,
            Some(Value::Number(n)) => n.as_i64().unwrap_or(0) != 0,
            Some(Value::String(st)) => matches!(st.as_str(), "1" | "true" | "True"),
            _ => false,
        };
        let product_id = it.get("product_id").cloned().unwrap_or(Value::Null);
        if is_service || product_id.is_null() || !line_tracks(&product_id) {
            continue;
        }
        let qty = as_qty(it.get("quantity").unwrap_or(&Value::Null)); // 10⁶ scale (ADR-0147)
        if qty <= 0 {
            continue;
        }
        if ops.is_empty() {
            ops.push(Operation::sql("inventory._ensure_location", Map::new()));
        }
        let mut dec = Map::new();
        dec.insert("product_id".into(), product_id);
        dec.insert("qty".into(), json!(qty));
        dec.insert("reason".into(), Value::Null);
        dec.insert("sale_id".into(), sale_id.clone());
        ops.push(Operation::sql("inventory._decrease_stock", dec));
    }
    Output { operations: ops, events: vec![], ..Default::default() }
}


/// El INCREMENTO de la unidad del producto, pre-cargado por el host en
/// `context.reads["inventory.products.unit_of"]` (ADR-0069 fase 2 — reads CON parámetros).
/// `None` si no hay read, si el producto no tiene unidad en el registro, o si el incremento no es
/// positivo: en esos casos no se valida rejilla y se sigue, que es preferible a bloquear una venta
/// por un registro incompleto.
fn increment_for_product(input: &Value) -> Option<i64> {
    let inc = input
        .get("context")?
        .get("reads")?
        .get("inventory.products.unit_of")?
        .as_array()?
        .first()?
        .get("increment_value")?;
    match inc {
        Value::Number(n) => n.as_i64().filter(|v| *v > 0),
        _ => None,
    }
}

/// `inventory.stock.decrease` — descuento de stock de UN producto, con VALIDACIÓN DE REJILLA.
///
/// Era Tier-0 (SQL directo). Pasa a handler por una sola razón: ADR-0147 §2.2 exige **rechazar**
/// una cantidad que no cae en el escalón de la unidad, y el SQL no puede rechazar — un `WHERE` que
/// no casa ninguna fila responde `ok`. Medio gramo en un producto con escalón de gramo se aceptaba
/// en silencio y modificaba el stock y las estadísticas sin que nadie lo viera.
///
/// El redondeo NO es una opción: pasar 0,0005 kg a 0,001 kg cambia lo vendido. Se rechaza y el
/// error nombra el incremento, para que la UI pueda decir «no vale en una unidad configurada en
/// escalones de 1 g».
///
/// Las tres operaciones son las mismas que ejecutaba el Tier-0; el guard de sobreventa y el de
/// `track_stock` siguen en el SQL (inventory#6), que es donde deben estar: dentro de la transacción.
pub fn decrease_stock_pure(input: Value) -> Result<HandlerOutput, String> {
    let (payload, _ids) = payload_context(&input);
    let product_id = payload.get("product_id").cloned().unwrap_or(Value::Null);
    let qty = as_qty(payload.get("qty").unwrap_or(&Value::Null));
    if product_id.is_null() || qty <= 0 {
        return Err("invalid_decrease: missing product_id or non-positive quantity".to_string());
    }

    if let Some(increment) = increment_for_product(&input) {
        if qty % increment != 0 {
            return Err(format!(
                "off_grid: {qty} is not valid for a unit with increments of {increment} \
                 (both in 10^6 scale). Adjust the quantity to the step; it is not rounded \
                 automatically because that would change what was sold."
            ));
        }
    }

    // Operating modes (#6), enforced against the hub's catalog of trust (`reads`). This is the
    // informative fast-path that makes the outcome VISIBLE (ADR-0205); the SQL WHERE of
    // `inventory._decrease_stock` remains the authoritative, in-transaction guard, so a race
    // between the read and the transaction can never oversell — it only loses the loud error.
    if let Some(settings) = stock_settings(&input) {
        let product_rows = read_rows(&input, "inventory.products.get");
        // Mode 2 (`track_stock = 0`): no automatic movements and no blocking — a clean no-op.
        // Since inventory#48 the hub flag is only the DEFAULT: a product that opted in still
        // decreases, so the hub-level short-circuit only applies when the product row is absent.
        if !settings.track && product_rows.is_none() {
            return Ok(HandlerOutput::noop());
        }
        if let Some(rows) = product_rows {
            let Some(product) = rows.first() else {
                return Ok(HandlerOutput::rejected(
                    "inventory.unknown_product",
                    format!("Product `{}` does not exist in this hub", as_str(&product_id)),
                ));
            };
            // Services never move stock, and neither does an article whose effective
            // `track_stock` is off (own flag, or NULL inheriting the hub) — benign no-op,
            // parity with the sale listener.
            if !product_tracks_stock(product, settings.track) {
                return Ok(HandlerOutput::noop());
            }
            let stock = product.get("stock").map(as_qty).unwrap_or(0);
            // Mode 3a (`allow_sell_without_stock = 0`): reject an insufficient decrease with a
            // stable, translatable code. Mode 3b (= 1) proceeds and the SQL represents the
            // resulting balance as is — negative included, never truncated.
            if !settings.allow_oversell && stock < qty {
                return Ok(HandlerOutput::rejected(
                    "inventory.insufficient_stock",
                    format!(
                        "Insufficient stock: requested {qty}, available {stock} \
                         (fixed-point quantities, 10^6 scale)"
                    ),
                ));
            }
        }
    }

    let mut ops: Vec<Operation> = Vec::new();
    ops.push(Operation::sql("inventory._ensure_location", Map::new()));

    // ONE atomic statement (data-modifying CTE): ledger movement + stock UPDATE share the same
    // guards and the same row version, so the ledger cannot record a decrease that did not
    // apply. The movement id is the runtime-injected `:new_id` (system param, per operation).
    let mut dec = Map::new();
    dec.insert("product_id".into(), product_id.clone());
    dec.insert("qty".into(), json!(qty));
    dec.insert("reason".into(), payload.get("reason").cloned().unwrap_or(Value::Null));
    dec.insert("sale_id".into(), payload.get("sale_id").cloned().unwrap_or(Value::Null));
    ops.push(Operation::sql("inventory._decrease_stock", dec));

    // `inventory.stock_changed` is CONDITIONAL since #6: it only travels when a decrease is
    // actually intended (never for rejections or mode-2 no-ops). Replaces the manifest-level
    // `emit`, which fired even when nothing changed.
    let events = vec![Event::new(
        "inventory.stock_changed",
        json!({ "product_id": product_id, "qty": qty }),
    )];

    Ok(HandlerOutput { operations: ops, events, error: None })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ctx(n: usize) -> Value {
        let ids: Vec<Value> = (0..n).map(|i| json!(format!("id-{i}"))).collect();
        json!({ "context": { "new_ids": ids } })
    }

    fn merge(payload: Value, mut base: Value) -> Value {
        base["payload"] = payload;
        base
    }

    #[test]
    fn bulk_create_generates_skus_and_correlates_ids() {
        let payload = json!({
            "existing_count": 5,
            "products": [
                { "name": "Café", "price": 4.5 },
                { "name": "Té", "sku": "TE-1", "price": 3.0, "stock": 20 }
            ]
        });
        let out = bulk_create_pure(merge(payload, ctx(4)));
        assert_eq!(out.operations.len(), 2);
        assert_eq!(out.operations[0].command, "inventory._insert_product");
        // SKU autogenerado continúa desde existing_count (5 → PROD-006).
        assert_eq!(out.operations[0].params["sku"], json!("PROD-006"));
        assert_eq!(out.operations[0].params["product_id"], json!("id-0"));
        // SKU explícito se respeta.
        assert_eq!(out.operations[1].params["sku"], json!("TE-1"));
        assert_eq!(out.operations[1].params["product_id"], json!("id-1"));
        assert_eq!(out.operations[1].params["stock"], json!(20));
    }

    #[test]
    fn bulk_create_caps_at_100() {
        let products: Vec<Value> = (0..150).map(|i| json!({ "name": format!("P{i}"), "price": 1 })).collect();
        let out = bulk_create_pure(merge(json!({ "products": products }), ctx(150)));
        assert_eq!(out.operations.len(), MAX_BULK);
    }

    #[test]
    fn receive_stock_skips_invalid_lines() {
        let payload = json!({
            "items": [
                { "product_id": "p1", "qty": 10, "unit_cost": 2.5 },
                { "product_id": "p2", "qty": 0 },          // qty inválida → omitida
                { "qty": 5 },                               // sin product_id → omitida
                { "product_id": "p3", "qty": 3 }
            ]
        });
        let out = receive_stock_pure(merge(payload, ctx(0)));
        assert_eq!(out.operations.len(), 2);
        assert_eq!(out.operations[0].command, "inventory._receive_line");
        assert_eq!(out.operations[0].params["product_id"], json!("p1"));
        assert_eq!(out.operations[0].params["qty"], json!(10));
        assert_eq!(out.operations[0].params["unit_cost"], json!(2.5));
        assert_eq!(out.operations[1].params["product_id"], json!("p3"));
        assert_eq!(out.operations[1].params["unit_cost"], Value::Null);
    }

    /// A listener's ops may only reference SQL commands of its OWN module (§5.3). Since #6,
    /// ledger movement + stock UPDATE are ONE atomic statement (`inventory._decrease_stock`,
    /// a data-modifying CTE): the movement can no longer outlive a decrease that did not apply
    /// (ghost row under concurrency), and both guards live in a single place.
    #[test]
    fn decrease_on_sale_skips_services_and_nulls() {
        let payload = json!({ "sale_id": "s-1", "items": [
            { "product_id": "p1", "quantity": 3_000_000, "is_service": false },
            { "product_id": "p2", "quantity": 1_000_000, "is_service": true },   // service → skipped
            { "product_id": null, "quantity": 5_000_000 },                        // no id → skipped
            { "product_id": "p3", "quantity": 2_000_000 }
        ]});
        let out = decrease_on_sale_pure(json!({ "payload": payload, "context": { "new_ids": ["m-0", "m-1"] } }));
        // 1 ensure_location + 1 atomic movement+decrease per sellable line.
        assert_eq!(out.operations.len(), 3, "{:?}", out.operations);
        assert_eq!(out.operations[0].command, "inventory._ensure_location");
        assert_eq!(out.operations[1].command, "inventory._decrease_stock");
        assert_eq!(out.operations[1].params["product_id"], json!("p1"));
        assert_eq!(out.operations[1].params["qty"], json!(3_000_000));
        assert_eq!(out.operations[1].params["sale_id"], json!("s-1"), "the ledger references the sale");
        assert_eq!(out.operations[2].command, "inventory._decrease_stock");
        assert_eq!(out.operations[2].params["product_id"], json!("p3"));
        assert_eq!(out.operations[2].params["qty"], json!(2_000_000));
    }

    // ── Modos operativos (inventory#6): el listener respeta `track_stock` vía reads ──

    fn input_with_settings(payload: Value, track_stock: i64) -> Value {
        json!({
            "payload": payload,
            "context": {
                "new_ids": [],
                "reads": { "inventory.settings.get": [
                    { "allow_sell_without_stock": 0, "low_stock_threshold": 10, "track_stock": track_stock }
                ]}
            }
        })
    }

    /// `track_stock = 0` → NINGÚN descuento; solo el marcador que evita que un void
    /// futuro restituya una venta que no generó movimientos (reusa inventory_void_restock).
    #[test]
    fn decrease_on_sale_track_off_emits_only_skip_marker() {
        let payload = json!({ "sale_id": "s-77", "items": [
            { "product_id": "p1", "quantity": 3_000_000, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(input_with_settings(payload, 0));
        assert_eq!(out.operations.len(), 1, "{:?}", out.operations);
        assert_eq!(out.operations[0].command, "inventory._skip_void_restock");
        assert_eq!(out.operations[0].params["sale_id"], json!("s-77"));
        assert!(out.events.is_empty());
    }

    /// `track_stock = 1` → decreases as always, WITHOUT the marker (a void must restock).
    #[test]
    fn decrease_on_sale_track_on_decreases_without_marker() {
        let payload = json!({ "sale_id": "s-78", "items": [
            { "product_id": "p1", "quantity": 3_000_000, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(input_with_settings(payload, 1));
        assert_eq!(out.operations.len(), 2, "{:?}", out.operations);
        assert_eq!(out.operations[0].command, "inventory._ensure_location");
        assert_eq!(out.operations[1].command, "inventory._decrease_stock");
    }

    /// Without `reads` (old manifest or a degraded query): falls back to the historical
    /// behavior (tracking on) — the final authoritative guard lives in the SQL.
    #[test]
    fn decrease_on_sale_without_reads_defaults_to_tracking() {
        let payload = json!({ "sale_id": "s-79", "items": [
            { "product_id": "p1", "quantity": 2_000_000, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(json!({ "payload": payload, "context": { "new_ids": ["m-0"] } }));
        assert_eq!(out.operations.len(), 2, "{:?}", out.operations);
        assert_eq!(out.operations[1].command, "inventory._decrease_stock");
    }

    /// Con tracking OFF y venta de SOLO servicios el marcador se emite igual (inofensivo:
    /// el restock de servicios ya es 0) — lo importante es que no haya descuentos.
    #[test]
    fn decrease_on_sale_track_off_services_only_no_decreases() {
        let payload = json!({ "sale_id": "s-80", "items": [
            { "product_id": "p9", "quantity": 1_000_000, "is_service": true }
        ]});
        let out = decrease_on_sale_pure(input_with_settings(payload, 0));
        assert!(out.operations.iter().all(|o| o.command != "inventory._decrease_stock"));
    }

    // ── ADR-0147: punto fijo 10⁶ — sustituye al arreglo parcial de #10 (HALF_UP sobre f64) ──

    /// Half a portion in 10⁶ scale travels AS IS: 2.5 kg is 2500000 and is not touched.
    #[test]
    fn decrease_on_sale_keeps_fixed_point_quantities() {
        let payload = json!({ "sale_id": "s-90", "items": [
            { "product_id": "p1", "quantity": 2_500_000, "is_service": false },
            { "product_id": "p2", "quantity": 125_000, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(json!({ "payload": payload, "context": { "new_ids": ["m-0", "m-1"] } }));
        assert_eq!(out.operations.len(), 3);
        assert_eq!(out.operations[1].params["qty"], json!(2_500_000));
        assert_eq!(out.operations[2].params["qty"], json!(125_000));
        // The reference to the source document travels in each movement (`sale`, #7).
        assert_eq!(out.operations[1].params["sale_id"], json!("s-90"));
    }

    /// A float reaching the listener is NOT rescued (ADR-0147): the conversion belongs at the
    /// boundary where the human types. `as_qty(2.5)` = 0 → the line is SKIPPED, never guessed.
    #[test]
    fn floats_in_the_event_are_not_rescued() {
        let payload = json!({ "items": [
            { "product_id": "p1", "quantity": 2.5, "is_service": false },
            { "product_id": "p2", "quantity": 1_000_000, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(json!({ "payload": payload, "context": { "new_ids": ["m-0", "m-1"] } }));
        // Only p2 produces the atomic movement+decrease; p1's float never crosses the boundary.
        assert_eq!(out.operations.len(), 2, "{:?}", out.operations);
        assert_eq!(out.operations[1].params["product_id"], json!("p2"));
    }

    // ── #6 / ADR-0205: `stock.decrease` speaks the DOMAIN-ERROR channel ────────────────
    //
    // The settings must GOVERN and the caller must SEE the outcome: a business rejection is
    // `HandlerOutput.error` (HTTP 409 with a stable, translatable code on an ADR-0205 runtime;
    // a clean silent no-op on older runtimes), a mode-2 no-op is NOT an error, and
    // `inventory.stock_changed` is only emitted when a decrease is actually intended.

    fn decrease_input(payload: Value, settings: Option<Value>, product: Option<Value>) -> Value {
        let mut reads = Map::new();
        if let Some(s) = settings {
            reads.insert("inventory.settings.get".into(), s);
        }
        if let Some(p) = product {
            reads.insert("inventory.products.get".into(), p);
        }
        json!({ "payload": payload, "context": { "new_ids": ["m-0"], "reads": Value::Object(reads) } })
    }

    fn settings_rows(track: i64, allow: i64) -> Value {
        json!([{ "track_stock": track, "allow_sell_without_stock": allow, "low_stock_threshold": 10_000_000 }])
    }

    fn product_rows(stock: i64, product_type: &str) -> Value {
        json!([{ "id": "p1", "stock": stock, "product_type": product_type }])
    }

    fn op_names(out: &HandlerOutput) -> Vec<&str> {
        out.operations.iter().map(|o| o.command.as_str()).collect()
    }

    /// Mode 2 (`track_stock = 0`): a clean no-op — no operations, no event, and NOT an error.
    #[test]
    fn decrease_track_off_is_a_clean_noop() {
        let out = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 1_000_000 }),
            Some(settings_rows(0, 0)),
            Some(product_rows(5_000_000, "physical")),
        ))
        .unwrap();
        assert!(out.operations.is_empty(), "{:?}", out.operations);
        assert!(out.events.is_empty(), "no stock_changed for a decrease that never happens");
        assert!(out.error.is_none(), "mode 2 is a supported mode, not an error");
    }

    /// Mode 3a (`allow_sell_without_stock = 0`): an insufficient decrease REJECTS with the
    /// stable code `inventory.insufficient_stock` — no silent 200-ok, nothing persisted.
    #[test]
    fn decrease_insufficient_stock_returns_domain_error() {
        let out = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 10_000_000 }),
            Some(settings_rows(1, 0)),
            Some(product_rows(5_000_000, "physical")),
        ))
        .unwrap();
        let err = out.error.expect("insufficient decrease must reject with a domain error");
        assert_eq!(err.code, "inventory.insufficient_stock");
        assert!(err.message.chars().count() <= 500, "ADR-0205 caps the message at 500 chars");
        assert!(out.operations.is_empty(), "a rejection persists nothing");
        assert!(out.events.is_empty(), "a rejection emits no stock_changed");
    }

    /// Mode 3b (`allow_sell_without_stock = 1`): overselling proceeds — the resulting negative
    /// balance is represented by the SQL, never truncated and never an error.
    #[test]
    fn decrease_insufficient_with_oversell_allowed_proceeds() {
        let out = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 10_000_000 }),
            Some(settings_rows(1, 1)),
            Some(product_rows(5_000_000, "physical")),
        ))
        .unwrap();
        assert!(out.error.is_none());
        assert_eq!(op_names(&out), ["inventory._ensure_location", "inventory._decrease_stock"]);
        assert_eq!(out.events.len(), 1, "the decrease is intended → stock_changed is emitted");
        assert_eq!(out.events[0].name, "inventory.stock_changed");
    }

    /// Sufficient decrease: ONE atomic movement+update op (ledger cannot ghost under
    /// concurrency) and the conditional `inventory.stock_changed`.
    #[test]
    fn decrease_sufficient_emits_one_atomic_op_and_the_event() {
        let out = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 3_000_000, "reason": "damaged" }),
            Some(settings_rows(1, 0)),
            Some(product_rows(5_000_000, "physical")),
        ))
        .unwrap();
        assert!(out.error.is_none());
        assert_eq!(op_names(&out), ["inventory._ensure_location", "inventory._decrease_stock"]);
        let dec = &out.operations[1];
        assert_eq!(dec.params["product_id"], json!("p1"));
        assert_eq!(dec.params["qty"], json!(3_000_000));
        assert_eq!(dec.params["reason"], json!("damaged"));
        assert_eq!(dec.params["sale_id"], Value::Null, "direct decrease → movement `decrease`");
        assert_eq!(out.events.len(), 1);
        assert_eq!(out.events[0].name, "inventory.stock_changed");
        assert_eq!(out.events[0].payload["product_id"], json!("p1"));
    }

    /// A decrease on a product the hub does not have (read present but EMPTY) is a domain
    /// error, not a silent no-op.
    #[test]
    fn decrease_unknown_product_returns_domain_error() {
        let out = decrease_stock_pure(decrease_input(
            json!({ "product_id": "ghost", "qty": 1_000_000 }),
            Some(settings_rows(1, 0)),
            Some(json!([])),
        ))
        .unwrap();
        let err = out.error.expect("unknown product must reject with a domain error");
        assert_eq!(err.code, "inventory.unknown_product");
        assert!(out.operations.is_empty());
    }

    /// Services never move stock: a direct decrease on a service is a benign no-op (parity
    /// with the sale listener, which skips service lines).
    #[test]
    fn decrease_service_product_is_a_clean_noop() {
        let out = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 1_000_000 }),
            Some(settings_rows(1, 0)),
            Some(product_rows(0, "service")),
        ))
        .unwrap();
        assert!(out.operations.is_empty(), "{:?}", out.operations);
        assert!(out.error.is_none());
    }

    /// Reads absent entirely (old manifest or degraded queries): the handler degrades and the
    /// SQL guards stay the single authority — the command still emits its ops, never an error.
    #[test]
    fn decrease_without_reads_degrades_to_sql_authority() {
        let out = decrease_stock_pure(json!({
            "payload": { "product_id": "p1", "qty": 1_000_000 },
            "context": { "new_ids": ["m-0"] }
        }))
        .unwrap();
        assert!(out.error.is_none());
        assert_eq!(op_names(&out), ["inventory._ensure_location", "inventory._decrease_stock"]);
    }

    // ── inventory#48: `track_stock` is a PER-PRODUCT flag (tri-state, NULL = follow the hub) ──
    //
    // The market (Square, Odoo, Shopify, WooCommerce, Business Central — sales#25) does not couple
    // the catalog to stock control: tracking is an opt-in per article. The hub setting is only the
    // default a NULL product inherits. Effective = product.track_stock ?? settings.track_stock ?? 1.

    fn sale_input(payload: Value, settings_track: i64, catalog: Value) -> Value {
        json!({
            "payload": payload,
            "context": {
                "new_ids": [],
                "reads": {
                    "inventory.settings.get": [
                        { "allow_sell_without_stock": 0, "low_stock_threshold": 10, "track_stock": settings_track }
                    ],
                    "inventory.products.for_sale": catalog
                }
            }
        })
    }

    /// Hub tracks stock, but ONE article opted out: its line generates no decrease, the other
    /// line still does — and no skip marker (the sale DID move stock).
    #[test]
    fn decrease_on_sale_skips_lines_whose_product_does_not_track_stock() {
        let payload = json!({ "sale_id": "s-48", "items": [
            { "product_id": "p-tracked", "quantity": 1_000_000, "is_service": false },
            { "product_id": "p-untracked", "quantity": 2_000_000, "is_service": false }
        ]});
        let catalog = json!([
            { "id": "p-tracked", "price": 100, "track_stock": 1 },
            { "id": "p-untracked", "price": 100, "track_stock": 0 }
        ]);
        let out = decrease_on_sale_pure(sale_input(payload, 1, catalog));
        let names: Vec<&str> = out.operations.iter().map(|o| o.command.as_str()).collect();
        assert_eq!(names, ["inventory._ensure_location", "inventory._decrease_stock"], "{:?}", out.operations);
        assert_eq!(out.operations[1].params["product_id"], json!("p-tracked"));
        assert!(!names.contains(&"inventory._skip_void_restock"), "the sale moved stock: no skip marker");
    }

    /// Hub does NOT track, but ONE article opted in: only that line decreases. The marker is NOT
    /// written either — a void must restock the tracked line (the void SQL filters per product).
    #[test]
    fn decrease_on_sale_hub_off_but_product_on_decreases_that_line() {
        let payload = json!({ "sale_id": "s-49", "items": [
            { "product_id": "p-on", "quantity": 1_000_000, "is_service": false },
            { "product_id": "p-inherit", "quantity": 1_000_000, "is_service": false }
        ]});
        let catalog = json!([
            { "id": "p-on", "price": 100, "track_stock": 1 },
            { "id": "p-inherit", "price": 100, "track_stock": 0 } // effective (inherits hub = off)
        ]);
        let out = decrease_on_sale_pure(sale_input(payload, 0, catalog));
        let names: Vec<&str> = out.operations.iter().map(|o| o.command.as_str()).collect();
        assert_eq!(names, ["inventory._ensure_location", "inventory._decrease_stock"], "{:?}", out.operations);
        assert_eq!(out.operations[1].params["product_id"], json!("p-on"));
    }

    /// Hub off and NO article opted in (every line effective 0): the historical mode-2 outcome —
    /// only the skip marker, so a later void does not restock a sale that never decreased.
    #[test]
    fn decrease_on_sale_hub_off_and_no_product_on_keeps_only_the_marker() {
        let payload = json!({ "sale_id": "s-50", "items": [
            { "product_id": "p-a", "quantity": 1_000_000, "is_service": false }
        ]});
        let catalog = json!([{ "id": "p-a", "price": 100, "track_stock": 0 }]);
        let out = decrease_on_sale_pure(sale_input(payload, 0, catalog));
        assert_eq!(out.operations.len(), 1, "{:?}", out.operations);
        assert_eq!(out.operations[0].command, "inventory._skip_void_restock");
    }

    /// Catalog read ABSENT (older manifest): the handler defers to the SQL WHERE, which carries the
    /// per-product guard — it must not skip anything on its own.
    #[test]
    fn decrease_on_sale_without_catalog_read_defers_to_sql() {
        let payload = json!({ "sale_id": "s-51", "items": [
            { "product_id": "p1", "quantity": 1_000_000, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(input_with_settings(payload, 1));
        assert_eq!(op_names_out(&out), ["inventory._ensure_location", "inventory._decrease_stock"]);
    }

    fn op_names_out(out: &Output) -> Vec<&str> {
        out.operations.iter().map(|o| o.command.as_str()).collect()
    }

    fn product_rows_tracking(stock: i64, track_stock: Value) -> Value {
        json!([{ "id": "p1", "stock": stock, "product_type": "physical", "track_stock": track_stock }])
    }

    /// Direct decrease on an article that opted OUT while the hub tracks: clean no-op, no event.
    #[test]
    fn decrease_product_track_off_is_a_clean_noop_even_if_hub_tracks() {
        let out = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 1_000_000 }),
            Some(settings_rows(1, 0)),
            Some(product_rows_tracking(0, json!(0))),
        ))
        .unwrap();
        assert!(out.operations.is_empty(), "{:?}", out.operations);
        assert!(out.events.is_empty());
        assert!(out.error.is_none(), "opting out is a supported state, not an error");
    }

    /// Direct decrease on an article that opted IN while the hub does NOT track: it decreases and
    /// the insufficient-stock rule applies to it.
    #[test]
    fn decrease_product_track_on_overrides_hub_off() {
        let ok = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 1_000_000 }),
            Some(settings_rows(0, 0)),
            Some(product_rows_tracking(5_000_000, json!(1))),
        ))
        .unwrap();
        assert!(ok.error.is_none());
        assert_eq!(op_names(&ok), ["inventory._ensure_location", "inventory._decrease_stock"]);
        assert_eq!(ok.events.len(), 1);

        let short = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 9_000_000 }),
            Some(settings_rows(0, 0)),
            Some(product_rows_tracking(5_000_000, json!(1))),
        ))
        .unwrap();
        assert_eq!(short.error.expect("tracked article must reject").code, "inventory.insufficient_stock");
    }

    /// NULL on the product = follow the hub: hub off → no-op; hub on → decreases.
    #[test]
    fn decrease_product_track_null_inherits_the_hub_setting() {
        let off = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 1_000_000 }),
            Some(settings_rows(0, 0)),
            Some(product_rows_tracking(5_000_000, Value::Null)),
        ))
        .unwrap();
        assert!(off.operations.is_empty() && off.error.is_none());

        let on = decrease_stock_pure(decrease_input(
            json!({ "product_id": "p1", "qty": 1_000_000 }),
            Some(settings_rows(1, 0)),
            Some(product_rows_tracking(5_000_000, Value::Null)),
        ))
        .unwrap();
        assert_eq!(op_names(&on), ["inventory._ensure_location", "inventory._decrease_stock"]);
    }

    /// bulk_create forwards the per-line `track_stock` (NULL when the line does not say).
    #[test]
    fn bulk_create_forwards_track_stock_per_line() {
        let payload = json!({ "products": [
            { "name": "A", "price": 1, "track_stock": 0 },
            { "name": "B", "price": 1 }
        ]});
        let out = bulk_create_pure(merge(payload, ctx(2)));
        assert_eq!(out.operations[0].params["track_stock"], json!(0));
        assert_eq!(out.operations[1].params["track_stock"], Value::Null);
    }

    /// receive_stock accepts qty in 10⁶ scale (receiving 1.75 kg = 1750000) and forwards `reference`.
    #[test]
    fn receive_stock_accepts_fixed_point_qty_and_reference() {
        let payload = json!({ "reference": "ALB-77", "items": [
            { "product_id": "p1", "qty": 1_750_000, "unit_cost": 300 }
        ]});
        let out = receive_stock_pure(merge(payload, ctx(0)));
        assert_eq!(out.operations.len(), 1);
        assert_eq!(out.operations[0].params["qty"], json!(1_750_000));
        assert_eq!(out.operations[0].params["reference"], json!("ALB-77"));
    }
}
