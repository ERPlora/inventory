-- Base projection of the hub's products. The runtime injects :hub_id.
-- This is a LIST query: the runtime composes search/filter/sort/pagination from the `list` block
-- in module.json. No ORDER BY / LIMIT / `;` here (the runtime adds them).
-- Every column meant to be sorted or filtered must be projected.
--
-- `needs_tax_setup` marks the products that predate inventory#38, when `tax_category_key` was
-- optional: they do not know how they are taxed, and the sale only fails at the till. They are NOT
-- migrated — assigning them a default category would be making up fiscal data — so they are FLAGGED
-- instead, and the list shows a third state («not configured») that can be filtered to review them
-- in one go. The empty string is the same hole as NULL, so both count.
--
-- `category_id` is the FILTER-SUPPORT projection of the product↔category M2M (inventory#71), and it
-- is the only shape the list engine can filter an M2M with. Three things decided it:
--
--   1. The engine filters over `sub.<col>` of the derived table, with `eq` / `like` / `range` only.
--      A product belongs to MANY categories (`inventory_product_categories`, with its own
--      `add_category` / `remove_category` commands), so there is no scalar «its category» to
--      project: picking one of them (a `MIN`, or the first row of the link table) would drop an
--      article from every category but one, and the loss is silent.
--   2. A comma-joined list of ids plus `op: "like"` looks tidy and is WRONG: ids are TEXT, so
--      filtering by `c-1` also answers `c-10`'s articles. A filter that returns rows that do not
--      belong is worse than one that returns none.
--   3. `f_*` is the engine's OWN namespace and is optional BY DESIGN — `required_binds`
--      (`crates/runtime/src/queries.rs`) excludes it from the mandatory-bind guard on purpose, and
--      an absent bind reaches the driver as `DynNull`. So the base SELECT may reference
--      `:f_category_id`: when nobody filters it binds NULL, the subquery yields NULL for every row
--      and the engine emits no condition — the list behaves exactly as it did before.
--
-- So the column ECHOES the category the row matched: the filtered id when the product is in it,
-- NULL otherwise (including every row of an unfiltered list). It is not «the product's category» —
-- the authoritative product→category map is the `inventory.product_categories` query — and it is
-- deliberately not painted by any screen.
SELECT id, name, sku, price, cost, stock, unit_code, price_quantity_value, pricing_unit_code, low_stock_threshold, tax_category_key,
       CASE WHEN tax_category_key IS NULL OR tax_category_key = '' THEN 1 ELSE 0 END AS needs_tax_setup,
       is_active, product_type, image, created_at,
       track_stock,  -- crudo 1/0/NULL (inventory#48): NULL = sigue el ajuste del hub
       -- At most ONE row can match: `(product_id, category_id)` is the link table's primary key
       -- and both are pinned here, so this needs no row cap (and a list query may carry none —
       -- the runtime appends its own, `tests/list_envelope.contract.test.py`).
       (SELECT pc.category_id
          FROM inventory_product_categories pc
         WHERE pc.product_id = inventory_product.id
           AND CAST(pc.category_id AS TEXT) = CAST(:f_category_id AS TEXT)) AS category_id
FROM inventory_product
WHERE hub_id = :hub_id AND is_deleted = 0
