# Módulo `inventory` — catálogo y control básico de stock

Módulo híbrido (SQL + WASM) del Hub. Es el **catálogo de productos** del POS
(productos, variantes, categorías, precios, coste, IVA por `tax_category_key`)
y la **única autoridad del stock básico** de un hub: saldo por producto/variante,
recepción, ajustes, descuento por venta y reversión al anular.

> **Module id:** `inventory` (canónico, sin prefijo). **Repo:** `module-inventory`.
> **Depende de:** `taxes` (instalar inventory auto-instala taxes, ADR-0066/0085).

## Frontera funcional (decidida 2026-07-15)

**Inventory debe bastar, completo, para una tienda pequeña o un restaurante:**

- Un stock por producto o variante y hub.
- Recepción manual de mercancía.
- Ajustes y recuentos.
- Historial auditable de movimientos (libro de movimientos, [#7]).
- Descuento por venta (`sale.completed`) y reversión (`sale.voided`, ADR-0075).
- Control de sobreventa y stock bajo ([#6]).
- Cantidades decimales y unidades básicas ([#10]).
- Valoración simple a coste ([#9]).

**Inventory NO gestiona almacenes.** El WMS avanzado pertenece al futuro módulo
opcional **`warehouse`**, que dependerá de inventory y operará **solo** mediante sus
comandos y eventos públicos — nunca mantendrá un segundo saldo ni tocará tablas
privadas de este módulo ([#11]). Quedan fuera de inventory:

- múltiples almacenes, ubicaciones físicas, zonas y bins;
- transferencias internas; picking, packing y expediciones;
- lotes, series y caducidades; recuentos cíclicos por ubicación;
- reservas y disponibilidad multiubicación;
- FIFO / coste medio avanzado; stock cross-store y conciliación.

Las **transferencias entre hubs** son visión condicionada, no capacidad prometida:
requieren una decisión transversal de sincronización (los Hub Local no tienen canal
entre sí, ADR-0040).

**Recetas/BOM tampoco viven aquí** ([#10]): un futuro módulo `recipes`/`manufacturing`
expandirá la receta y pedirá a inventory el consumo de ingredientes mediante un
contrato idempotente. Sin ese módulo, inventory funciona con productos simples.

## Modos operativos ([#6])

| Modo | Comportamiento |
| ---- | -------------- |
| Inventory **no instalado** | Sales/POS funcionan sin dependencia dura: disponibilidad vía `queryOptional` (ADR-0127) → `undefined` = venta libre, sin movimientos. |
| Instalado, `track_stock = false` | Solo catálogo, precios y categorías: no bloquea ventas ni crea movimientos automáticos. |
| Instalado, `track_stock = true` | Control real: con `allow_sell_without_stock = false` rechaza atómicamente stock insuficiente; con `true` permite la venta y representa el saldo resultante (también negativo, sin truncar a cero). |

La comprobación desde el POS es solo informativa (feedback inmediato); la validación
**autoritativa y atómica** la hace siempre el comando que registra el consumo.

## Diseño location-ready ([#7], [#11])

El MVP es explícitamente de **ubicación única**, pero el saldo canónico y el libro de
movimientos nacen preparados para ubicación:

- cada hub tiene una **ubicación lógica predeterminada** estable;
- saldos y movimientos incluyen `location_id`; los comandos lo resuelven cuando el
  caller no lo envía;
- los eventos públicos incluyen la ubicación, la UI básica no la expone;
- **un único saldo canónico y un único libro** — `warehouse` añadirá ubicaciones
  físicas y operaciones avanzadas sobre estos contratos, sin duplicar la autoridad.

## Qué expone hoy

| Tipo | Nombre | Permiso |
| ---- | ------ | ------- |
| query | `inventory.products.list` / `.get` / `.low_stock` / `.stats` | `inventory.view_product` |
| query | `inventory.product_categories` | `inventory.view_product` |
| query | `inventory.categories.list` | `inventory.view_category` |
| query | `inventory.settings.get` | `inventory.manage_settings` |
| command | `inventory.products.create/update/delete`, `bulk_create` (WASM) | `inventory.add/change/delete_product` |
| command | `inventory.stock.adjust/decrease`, `stock.receive` (WASM) | `inventory.change_product` |
| command | `inventory.categories.create/update/delete` | `inventory.add/change/delete_category` |
| command | `inventory.settings.update` | `inventory.manage_settings` |
| listener | `sale.completed` → `stock.decrease_on_sale` (WASM) · `sale.voided` → `_restock_on_void` | — |
| emite | `inventory.product.created/updated/deleted`, `inventory.stock_changed` | — |

Navegación: `erp-inventory-dashboard`, `erp-inventory-products`,
`erp-inventory-categories`; ajustes declarativos (ADR-0082).

## Layout

```text
module.json                  # manifest (contrato técnico; la clasificación de
                             # marketplace vive en el vendor portal, no aquí)
migrations/{sqlite,postgres}/ # esquema §2.5 (hub_id + soft-delete + auditoría)
queries/*.sql                # lecturas declarativas (:hub_id inyectado)
commands/*.sql               # escrituras declarativas
schemas/*.json               # JSON Schemas de input (draft 2020-12)
handler/                     # WASM Tier 2 (bulk_create, receive_stock,
                             # decrease_on_sale) → dist/handler.wasm
ui/                          # Web Components (Lit/Ionic/OutfitKit)
```

## Estado y trabajo abierto

El estado vive en las **Issues de este repo** (no aquí). La frontera de arriba se
implementa en: [#6] modos operativos y sobreventa · [#7] libro de movimientos +
recepción/ajuste/recuento · [#9] dashboard + valoración a coste · [#10] decimales,
unidades y contrato de consumo · [#11] preparación para `warehouse` sin duplicar la
autoridad del stock.

Doc de arquitectura: `architecture/modules/inventory.md` (cargarlo antes de tocar el
módulo).

[#6]: https://github.com/ERPlora/inventory/issues/6
[#7]: https://github.com/ERPlora/inventory/issues/7
[#9]: https://github.com/ERPlora/inventory/issues/9
[#10]: https://github.com/ERPlora/inventory/issues/10
[#11]: https://github.com/ERPlora/inventory/issues/11
