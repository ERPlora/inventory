# Inventory — Overview

## What this module does

Inventory is the product catalogue and the basic stock control of the hub. It holds the source of
truth for every product you sell (name, SKU, price, cost, tax category, unit of measure) and for how
many units of it you have. It is the **only authority for basic stock** in the hub: every change of
stock — a reception, a sale, a void, a count — is written to an immutable movement ledger in the same
transaction that changes the balance.

## What this module does NOT do

- **It is not a warehouse system.** There is one single logical location. Multi-warehouse, bins and
  zones, transfers, picking and packing, lot/serial/expiry tracking, cycle counts, multi-location
  reservations, FIFO or average-cost valuation and cross-store stock are **out of scope on purpose**
  and belong to the future optional `warehouse` module.
- **It does not compute taxes.** It only stores which tax category a product belongs to
  (`tax_category_key`); the rates and the tax maths live in `taxes`.
- **It does not price a sale.** It publishes the sale catalogue; the sale total is decided by `sales`.
- **It does not do recipes or manufacturing** (no bill of materials, no ingredient depletion).
- **It does not manage product variants in the UI.** The `inventory_product_variant` table exists but
  no screen or command drives it today. <!-- TODO: verify -->

## Stock valuation is basic on purpose

`inventory.products.stats` returns `total_inventory_value` as the plain sum of `cost × stock` over
active physical products with stock above zero, in **cents**. Services do not contribute a value, and
negative stock produced by overselling does not subtract. FIFO, average cost and per-warehouse
valuation belong to the future `warehouse` module.

## Modules it connects to

**Depends on `taxes`** — installing Inventory installs `taxes` automatically. A product's or a
category's `tax_category_key` is validated against `taxes.categories.get` before it is written; the
hub refuses to save a product pointing at a tax category that does not exist.

**Events it emits**

| Event | Emitted when |
|---|---|
| `inventory.product.created` | a product is created |
| `inventory.product.updated` | a product is updated |
| `inventory.product.deleted` | a product is soft-deleted |
| `inventory.product.categorized` | a product is linked to a category |
| `inventory.product.uncategorized` | a product is unlinked from a category |
| `inventory.stock_changed` | a stock count is applied, or a decrease is actually applied |
| `inventory.low_stock_crossed` | a movement takes a tracked article ACROSS its low-stock threshold (#47) |

`inventory.stock_changed` is **conditional** on a decrease: the handler returns the event only when
stock really moved, so a rejected decrease does not announce a change that never happened. It
describes the **movement** (`product_id`, `qty`), not the balance.

`inventory.low_stock_crossed` describes the **transition**, so a flow can reorder without computing
balances. Payload: `product_id`, `sku`, `name`, `previous_quantity`, `current_quantity`,
`low_stock_threshold` (the product's own, 10⁶ fixed-point like every quantity), `crossing`
(`below` when previous > threshold and current ≤ threshold; `recovered` when previous ≤ threshold and
current > threshold), `movement_type` (`sale` · `decrease` · `reception` · `count`), `source_ref`
(sale id or delivery reference), `occurred_at`, `dedup_key`. The hysteresis lives here: staying below
the threshold is silence, and only a `recovered` re-arms the next `below`. Articles that do not track
stock (#48) never cross. A void restock (`sale.voided`) does not emit it today (SQL listener; a
missed `recovered` only means the next sale below the threshold announces `below` again).

**Events it listens to**

| Event | Runs | Effect |
|---|---|---|
| `sale.completed` (from `sales`) | `inventory.stock.decrease_on_sale` | Decreases the stock of every sold physical line — and, for a **composed** line (a menu, a pack), of each of its components instead of the line itself |
| `sale.voided` (from `sales`) | `inventory._restock_on_void` | Gives back exactly what the sale took out, read from this module's own movement ledger |

**Consumed by `sales`** — `sales` reads `inventory.products.for_sale` to price sale lines
server-side. That query is deliberately not paginated: a paginated read would silently hand back only
the first page and the rest of the catalogue would price as unknown.

## Where its numbers come from

- **All money is integer cents** (ADR-0123). `price`, `cost`, `unit_cost` and
  `total_inventory_value` are cents: `1250` is 12,50 €. There are no decimal amounts anywhere.
- **All quantities are fixed-point integers with a scale of 1 000 000** (ADR-0147). `stock`, a
  movement `qty`, `stock_after` and the per-product low-stock threshold are stored multiplied by
  10⁶: `3000000` is 3 units. Only the UI converts, at the boundary with the human.
