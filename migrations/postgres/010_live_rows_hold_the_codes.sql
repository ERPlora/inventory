-- Inventory · 010 — inventory#98: a deleted product frees its SKU and its EAN-13.
DROP INDEX IF EXISTS ix_inventory_product_sku;
CREATE UNIQUE INDEX IF NOT EXISTS ix_inventory_product_sku ON inventory_product (hub_id, sku) WHERE is_deleted = 0;
DROP INDEX IF EXISTS ix_inventory_product_ean13;
CREATE UNIQUE INDEX IF NOT EXISTS ix_inventory_product_ean13 ON inventory_product (hub_id, ean13) WHERE is_deleted = 0;

-- (Prose at the end on purpose: a semicolon inside a leading comment block is what splits a
-- migration in the wrong place.)
--
-- WHAT CHANGES. `products.delete` is a soft delete, but 001 made both codes unique over EVERY row,
-- dead ones included. So an owner who deleted an article and created it again with the same code
-- (by hand or by re-importing the CSV) got a generic error, because the runtime redacts the
-- database message (hub#1074) and the clashing article is in no list. Shopify, Square and
-- Lightspeed let a deleted article's code be used again, and so does the module from here on: the
-- uniqueness now holds over the LIVE rows only.
--
-- WHY THIS PREDICATE. `(is_deleted = 0)` is the one form the hub's blueprint importer reads as a
-- natural key (`export.rs::natural_keys` parses a conjunction of `column = literal`). Anything
-- else would be discarded there and a bundle bringing an article the hub already has would clash
-- again and lose the whole inventory section (hub#753).
--
-- WHAT IT DOES NOT TOUCH. `ix_inventory_variant_sku` stays as it is: no command writes variants
-- today, so there is no deleted variant to free.
--
-- REVERSIBLE. Recreate both indexes without the `WHERE` clause. That only builds on a hub where no
-- deleted article shares a code with another row, so check first with
-- SELECT hub_id, sku FROM inventory_product GROUP BY hub_id, sku HAVING COUNT(*) > 1
-- (and the same for ean13), or the boot aborts.
--
-- Re-entrant: dropping and rebuilding the same partial index on a second run changes nothing.
