-- inventory#42 — a number that never crossed the 10⁶ frontier is NOT a quantity, and the database
-- says so from here on.
--
-- What happened. The published `restaurante`/`pizzeria` bundles seeded 280/50 products with
-- `stock = 100` and `low_stock_threshold = 10` written RAW, against the global fixed-point scale of
-- ADR-0147 (006/007). The hub accepted them without a word and the catalog opened showing `0.0001`
-- units on every article, `0,00 €` of stock value and not one low-stock warning: the first
-- customer's inventory lied from minute one. The bundle was re-scaled by hand on 2026-08-24
-- (v1.2.0) — but nothing stopped the next export from doing it again, and that is the actual defect
-- this file closes.
--
-- Why no layer above caught it, and why the guard belongs HERE. `import_sql.rs` validates the SHAPE
-- of a blueprint statement (INSERT of literals into its own tables), never the MEANING of the
-- values — deliberately, it is a kernel and knows nothing about inventory's columns. `onGrid`
-- (ui/lib/quantity.ts) does check the grid, but it runs in the BROWSER, and a blueprint import, the
-- public API, a flow and the assistant all reach the table without passing through it. The table is
-- the one door every writer shares, and it is ours. Same shape as the rest of the module: the SQL
-- is the authoritative guard and the UI mirrors it.
--
-- The invariant, and why the constant is 1000. ADR-0147 puts every quantity on the grid its unit
-- declares (`inventory_unit.increment_value`). The finest grid in the canonical registry
-- (seed/install.postgres.sql) is 1/1000 of the base unit — the gram inside `kg`, the millilitre
-- inside `l`, the kilo inside `t`; every other unit is coarser (`ud`/`g`/`ml`/`min` = 1000000,
-- `h` = 250000, and there is no command to add a unit). So EVERY legal quantity, in every unit, is
-- a multiple of 1000, and a value that is not cannot be expressed by any unit we ship. Checking the
-- product's own unit would be stricter, but it needs a subquery: a CHECK cannot, and a trigger is
-- not available either — the hub's migration guard refuses a procedural body in a module migration
-- (hub#1149). The floor catches the whole bug class (100, 20, 10, 5) without a single false
-- positive over the registry, which is what a guard has to earn.

-- ── 1. Repair what a bad bundle already wrote ───────────────────────────────────────────
-- Bounded on purpose to `ABS(value) < 1000000`: off the grid AND smaller than one whole unit is
-- the unambiguous signature of a raw count that never crossed the frontier — it cannot even be one
-- gram. `* 1000000` is not a new decision, it is exactly the re-scale 006/007 applied to this same
-- data, and exactly what the 2026-08-24 republication did to the bundle by hand.
--
-- This is not cosmetic. Postgres re-checks the WHOLE row on UPDATE even for a `NOT VALID`
-- constraint, so leaving those rows in place would make every product of an already-seeded hub
-- read-only — the constraint would have shipped a worse regression than the bug it fixes.
UPDATE inventory_product
SET stock = stock * 1000000
WHERE stock % 1000 <> 0 AND ABS(stock) < 1000000;

UPDATE inventory_product
SET low_stock_threshold = low_stock_threshold * 1000000
WHERE low_stock_threshold % 1000 <> 0 AND ABS(low_stock_threshold) < 1000000;

UPDATE inventory_product_variant
SET stock = stock * 1000000
WHERE stock % 1000 <> 0 AND ABS(stock) < 1000000;

UPDATE inventory_stock_movement
SET qty = qty * 1000000
WHERE qty % 1000 <> 0 AND ABS(qty) < 1000000;

UPDATE inventory_stock_movement
SET stock_after = stock_after * 1000000
WHERE stock_after % 1000 <> 0 AND ABS(stock_after) < 1000000;

-- ── 2. The guard ────────────────────────────────────────────────────────────────────────
-- `NOT VALID` so that installing this can NEVER fail on a live hub: a row outside the repaired band
-- is left exactly as it is instead of blocking the module update of a customer who is selling. Every
-- INSERT and UPDATE from here on is checked all the same — which is the whole point, because the
-- blueprint import is an INSERT.
ALTER TABLE inventory_product
ADD CONSTRAINT ck_inventory_product_stock_on_grid CHECK (stock % 1000 = 0) NOT VALID;

ALTER TABLE inventory_product
ADD CONSTRAINT ck_inventory_product_threshold_on_grid CHECK (low_stock_threshold % 1000 = 0) NOT VALID;

ALTER TABLE inventory_product_variant
ADD CONSTRAINT ck_inventory_product_variant_stock_on_grid CHECK (stock % 1000 = 0) NOT VALID;

ALTER TABLE inventory_stock_movement
ADD CONSTRAINT ck_inventory_stock_movement_qty_on_grid CHECK (qty % 1000 = 0) NOT VALID;

ALTER TABLE inventory_stock_movement
ADD CONSTRAINT ck_inventory_stock_movement_stock_after_on_grid CHECK (stock_after % 1000 = 0) NOT VALID;
