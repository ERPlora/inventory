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

use erplora_guest_sdk::{Operation, Output};
use serde_json::{json, Map, Value};

#[cfg(feature = "guest")]
use extism_pdk::*;

/// Alta batch de productos. Exporta `bulk_create`.
#[cfg(feature = "guest")]
#[plugin_fn]
pub fn bulk_create(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    Ok(Json(bulk_create_pure(input.into_inner().into_value())))
}

/// Recepción de stock batch. Exporta `receive_stock`.
#[cfg(feature = "guest")]
#[plugin_fn]
pub fn decrease_stock(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
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
        p.insert("low_stock_threshold".into(), item.get("low_stock_threshold").cloned().unwrap_or(json!(10)));
        p.insert("tax_category_key".into(), opt_str(item, "tax_category_key"));
        p.insert("image".into(), json!(as_str(item.get("image").unwrap_or(&Value::Null))));
        ops.push(Operation::sql("inventory._insert_product", p));
    }
    Output { operations: ops, events: vec![] }
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
    Output { operations: ops, events: vec![] }
}

/// `track_stock` de los ajustes del hub, PRE-CARGADOS por el host en
/// `context.reads["inventory.settings.get"]` (ADR-0069; el manifest declara `reads`).
/// Sin reads (manifest viejo o query caída) degrada a `true` — el guard autoritativo
/// final vive en el SQL de `stock.decrease` (inventory#6).
fn track_stock_enabled(input: &Value) -> bool {
    input
        .get("context")
        .and_then(|c| c.get("reads"))
        .and_then(|r| r.get("inventory.settings.get"))
        .and_then(|rows| rows.as_array())
        .and_then(|a| a.first())
        .and_then(|row| row.get("track_stock"))
        .map(|v| as_i64(v, 1) != 0)
        .unwrap_or(true)
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
    if !track_stock_enabled(&input) {
        let mut ops: Vec<Operation> = Vec::new();
        let sale_id = payload.get("sale_id").cloned().unwrap_or(Value::Null);
        if !sale_id.is_null() {
            let mut p = Map::new();
            p.insert("sale_id".into(), sale_id);
            ops.push(Operation::sql("inventory._skip_void_restock", p));
        }
        return Output { operations: ops, events: vec![] };
    }
    let empty: Vec<Value> = Vec::new();
    let items = payload.get("items").and_then(|v| v.as_array()).unwrap_or(&empty);
    // Referencia al documento origen (#7): el movimiento `sale` del ledger la registra.
    let sale_id = payload.get("sale_id").cloned().unwrap_or(Value::Null);
    let mut ops: Vec<Operation> = Vec::new();
    for it in items {
        let is_service = match it.get("is_service") {
            Some(Value::Bool(b)) => *b,
            Some(Value::Number(n)) => n.as_i64().unwrap_or(0) != 0,
            Some(Value::String(st)) => matches!(st.as_str(), "1" | "true" | "True"),
            _ => false,
        };
        let product_id = it.get("product_id").cloned().unwrap_or(Value::Null);
        if is_service || product_id.is_null() {
            continue;
        }
        let qty = as_qty(it.get("quantity").unwrap_or(&Value::Null)); // escala 10⁶ (ADR-0147)
        if qty <= 0 {
            continue;
        }
        let mut p = Map::new();
        p.insert("product_id".into(), product_id);
        p.insert("qty".into(), json!(qty));
        p.insert("sale_id".into(), sale_id.clone());
        ops.push(Operation::sql("inventory.stock.decrease", p));
    }
    Output { operations: ops, events: vec![] }
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
pub fn decrease_stock_pure(input: Value) -> Result<Output, String> {
    let (payload, ids) = payload_context(&input);
    let product_id = payload.get("product_id").cloned().unwrap_or(Value::Null);
    let qty = as_qty(payload.get("qty").unwrap_or(&Value::Null));
    if product_id.is_null() || qty <= 0 {
        return Err("invalid_decrease: falta product_id o la cantidad no es positiva".to_string());
    }

    if let Some(increment) = increment_for_product(&input) {
        if qty % increment != 0 {
            return Err(format!(
                "off_grid: {qty} no es válida para una unidad con incrementos de {increment} \
                 (ambas en escala 10^6). Ajusta la cantidad al escalón; no se redondea sola porque \
                 eso cambiaría lo vendido."
            ));
        }
    }

    let new_id = ids.first().cloned().unwrap_or_default();
    let mut ops: Vec<Operation> = Vec::new();
    ops.push(Operation::sql("inventory._ensure_location", Map::new()));

    let mut mov = Map::new();
    mov.insert("new_id".into(), json!(new_id));
    mov.insert("product_id".into(), product_id.clone());
    mov.insert("qty".into(), json!(qty));
    mov.insert("reason".into(), payload.get("reason").cloned().unwrap_or(Value::Null));
    mov.insert("sale_id".into(), payload.get("sale_id").cloned().unwrap_or(Value::Null));
    ops.push(Operation::sql("inventory._movement_on_decrease", mov));

    let mut dec = Map::new();
    dec.insert("product_id".into(), product_id);
    dec.insert("qty".into(), json!(qty));
    ops.push(Operation::sql("inventory._decrease_stock", dec));

    Ok(Output { operations: ops, events: vec![] })
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

    #[test]
    fn decrease_on_sale_skips_services_and_nulls() {
        let payload = json!({ "items": [
            { "product_id": "p1", "quantity": 3, "is_service": false },
            { "product_id": "p2", "quantity": 1, "is_service": true },   // servicio → omitido
            { "product_id": null, "quantity": 5 },                        // sin id → omitido
            { "product_id": "p3", "quantity": 2 }
        ]});
        let out = decrease_on_sale_pure(json!({ "payload": payload, "context": { "new_ids": [] } }));
        assert_eq!(out.operations.len(), 2);
        assert_eq!(out.operations[0].command, "inventory.stock.decrease");
        assert_eq!(out.operations[0].params["product_id"], json!("p1"));
        assert_eq!(out.operations[0].params["qty"], json!(3));
        assert_eq!(out.operations[1].params["product_id"], json!("p3"));
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
            { "product_id": "p1", "quantity": 3, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(input_with_settings(payload, 0));
        assert_eq!(out.operations.len(), 1, "{:?}", out.operations);
        assert_eq!(out.operations[0].command, "inventory._skip_void_restock");
        assert_eq!(out.operations[0].params["sale_id"], json!("s-77"));
        assert!(out.events.is_empty());
    }

    /// `track_stock = 1` → descuenta como siempre, SIN marcador (el void debe restituir).
    #[test]
    fn decrease_on_sale_track_on_decreases_without_marker() {
        let payload = json!({ "sale_id": "s-78", "items": [
            { "product_id": "p1", "quantity": 3, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(input_with_settings(payload, 1));
        assert_eq!(out.operations.len(), 1);
        assert_eq!(out.operations[0].command, "inventory.stock.decrease");
    }

    /// Sin `reads` (manifest viejo o query caída): degrada al comportamiento histórico
    /// (tracking activo) — el guard autoritativo final vive en el SQL.
    #[test]
    fn decrease_on_sale_without_reads_defaults_to_tracking() {
        let payload = json!({ "sale_id": "s-79", "items": [
            { "product_id": "p1", "quantity": 2, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(json!({ "payload": payload, "context": { "new_ids": [] } }));
        assert_eq!(out.operations.len(), 1);
        assert_eq!(out.operations[0].command, "inventory.stock.decrease");
    }

    /// Con tracking OFF y venta de SOLO servicios el marcador se emite igual (inofensivo:
    /// el restock de servicios ya es 0) — lo importante es que no haya descuentos.
    #[test]
    fn decrease_on_sale_track_off_services_only_no_decreases() {
        let payload = json!({ "sale_id": "s-80", "items": [
            { "product_id": "p9", "quantity": 1, "is_service": true }
        ]});
        let out = decrease_on_sale_pure(input_with_settings(payload, 0));
        assert!(out.operations.iter().all(|o| o.command != "inventory.stock.decrease"));
    }

    // ── Decimales (#10): fin del truncado float→i64 ──────────────────────────

    /// Una venta de 2,5 kg descuenta 2,5 — no 2 (el bug de #10).
    #[test]
    fn decrease_on_sale_keeps_decimal_quantities() {
        let payload = json!({ "sale_id": "s-90", "items": [
            { "product_id": "p1", "quantity": 2.5, "is_service": false },
            { "product_id": "p2", "quantity": 0.125, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(json!({ "payload": payload, "context": { "new_ids": [] } }));
        assert_eq!(out.operations.len(), 2);
        assert_eq!(out.operations[0].params["qty"], json!(2.5));
        // Redondeo CONTROLADO a 3 decimales en la frontera (HALF_UP), nunca truncado.
        assert_eq!(out.operations[1].params["qty"], json!(0.125));
        // La referencia al documento origen viaja en cada op (movimiento `sale`, #7).
        assert_eq!(out.operations[0].params["sale_id"], json!("s-90"));
    }

    /// Cantidades con más de 3 decimales se redondean HALF_UP (no se truncan ni pasan crudas).
    #[test]
    fn decimal_quantities_round_half_up_to_3_decimals() {
        let payload = json!({ "items": [
            { "product_id": "p1", "quantity": 0.0005, "is_service": false },
            { "product_id": "p2", "quantity": 1.23456, "is_service": false }
        ]});
        let out = decrease_on_sale_pure(json!({ "payload": payload, "context": { "new_ids": [] } }));
        assert_eq!(out.operations[0].params["qty"], json!(0.001), "HALF_UP, no truncar a 0");
        assert_eq!(out.operations[1].params["qty"], json!(1.235));
    }

    /// receive_stock acepta qty decimal (recepción de 1,75 kg) y pasa `reference` a cada línea.
    #[test]
    fn receive_stock_accepts_decimal_qty_and_reference() {
        let payload = json!({ "reference": "ALB-77", "items": [
            { "product_id": "p1", "qty": 1.75, "unit_cost": 300 }
        ]});
        let out = receive_stock_pure(merge(payload, ctx(0)));
        assert_eq!(out.operations.len(), 1);
        assert_eq!(out.operations[0].params["qty"], json!(1.75));
        assert_eq!(out.operations[0].params["reference"], json!("ALB-77"));
    }
}
