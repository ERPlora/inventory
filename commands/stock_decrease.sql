-- Stock decrease of ONE product by :qty, GOVERNED by the hub settings (inventory#6,
-- ADR-0135 boundary), as ONE atomic statement: ledger movement + stock UPDATE share the
-- same guards and the same locked row version (data-modifying CTE, Postgres-only per
-- ADR-0154). Replaces the old two-sheet pair (`_movement_on_decrease` + this UPDATE),
-- where a concurrent decrease could commit a GHOST ledger row: the movement INSERT saw the
-- pre-lock stock while the UPDATE re-evaluated its WHERE after the lock wait and no-op'ed.
--
-- Operating modes (the WHERE is the authoritative, in-transaction guard for EVERY caller —
-- POS, API, events, assistant; the WASM handler's read-based check is the informative
-- fast-path that surfaces the loud domain error, ADR-0205):
--   * effective track_stock = 0  -> NO-OP: no automatic movements (mode 2). Since inventory#48
--                                   the flag is PER PRODUCT (tri-state, ADR-0368): the row's own
--                                   `track_stock` wins; NULL follows the hub setting; no settings
--                                   row = 1.
--   * allow_sell_without_stock=1 -> always decreases; the resulting balance is represented
--                                   as is (negative included) — never truncated to 0.
--   * allow_sell_without_stock=0 -> only decreases with sufficient stock (stock >= :qty);
--                                   otherwise 0 rows = ATOMIC rejection, and no movement
--                                   can exist without its decrease (single statement).
-- No settings row -> schema defaults via COALESCE (track=1, allow=0).
-- Services never move stock (product_type != 'service').
-- Movement type: `sale` when :sale_id references the source document (#7), `decrease` for a
-- direct decrease. inventory#28/QA-PG: bare params in conditions cannot infer their type in
-- Postgres (42P08) -> CAST(:sale_id/:reason/:location_id AS TEXT).
-- Runtime injects :hub_id, :now, :new_id (movement id), :current_user_id;
-- :product_id, :qty, :reason, :sale_id come from the operation params.
WITH dec AS (
    UPDATE inventory_product
    SET stock = stock - CAST(:qty AS BIGINT),
        updated_at = :now
    WHERE id = :product_id AND hub_id = :hub_id AND is_deleted = 0
      AND product_type != 'service'
      AND COALESCE(track_stock,
                   (SELECT s.track_stock
                    FROM inventory_settings s
                    WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 1) = 1
      AND (COALESCE((SELECT s.allow_sell_without_stock
                     FROM inventory_settings s
                     WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 0) = 1
           OR stock >= CAST(:qty AS BIGINT))
    RETURNING id, stock AS stock_after
)
INSERT INTO inventory_stock_movement
    (id, hub_id, location_id, product_id, movement_type, qty, stock_after,
     reason, reference, is_deleted, created_by, created_at)
SELECT :new_id, :hub_id,
       COALESCE(CAST(:location_id AS TEXT), :hub_id || ':default'),
       d.id,
       CASE WHEN CAST(:sale_id AS TEXT) IS NULL THEN 'decrease' ELSE 'sale' END,
       0 - CAST(:qty AS BIGINT), d.stock_after,
       CAST(:reason AS TEXT), CAST(:sale_id AS TEXT), 0, :current_user_id, :now
FROM dec AS d;
