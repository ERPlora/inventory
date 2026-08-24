-- Stock restitution when a sale is VOIDED (listener of `sale.voided`, ADR-0073) — SHEET 1/3.
-- inventory#28/QA-PG: each file of the command's `sql[]` runs as ONE prepared statement
-- (`cmd.sql.iter()` -> one op per sheet, all in the SAME transaction). Postgres REFUSES several
-- commands in a single prepared statement ("cannot insert multiple commands into a prepared
-- statement"), SQLite tolerated it, and that is why the bug only showed in Hub Cloud and deferred
-- the whole delivery of `sale.voided` (neither restock nor cash extornment). The restitution is
-- split into 3 single-statement sheets, in this ORDER (it matters):
--   1) this ledger movement, 2) the stock UPDATE, 3) the idempotency marker.
--
-- 🔴 THE SOURCE IS THE LEDGER, NOT THE SALE LINES (inventory#69, ADR-0381). Until now both sheets
-- re-derived the restitution from `sales_sale_item`, and that was wrong in two ways:
--   * A COMBO has no stock of its own -- a menú del día is one line whose components live in the
--     line's SNAPSHOT, not in rows. Reading the lines gave back the combo (not an article, so
--     nothing) and left every component short. The stock is moved by the components, so the stock
--     is given back by the components.
--   * It gave back what the sale SAID, not what actually left. A decrease rejected for
--     insufficient stock (`allow_sell_without_stock = 0`, 0 rows, no movement) was restocked
--     anyway on the void, INVENTING stock that never existed. The ledger cannot lie about that:
--     `_decrease_stock` writes movement and UPDATE in one atomic statement, so a row here means
--     the stock really left.
-- It also drops inventory's last SQL reach into a `sales` table, which is the modularity the
-- module contract asks for: what a void reverses is this module's own book.
--
-- Reversal of the `sale` movements of this sale: one `void` movement per product, with a
-- DETERMINISTIC id `<sale_id>:void:<product_id>` (idempotent by PK against re-deliveries, on top
-- of the marker). Inserted BEFORE the UPDATE to capture the PREVIOUS balance (`p.stock + SUM`),
-- with the SAME conditions as the UPDATE (marker included). `qty` of a `sale` movement is
-- negative, so what comes back is `SUM(-qty)`, in 10⁶ fixed point (ADR-0147).
--
-- No per-article `track_stock` guard here on purpose (ADR-0368): the flag decided at SALE time and
-- the ledger recorded the outcome. An article that did not track has no `sale` movement and gets
-- nothing back -- while re-reading today's flag would refuse to return stock that did leave, just
-- because the shop changed the setting in between.
-- Runtime injects :hub_id, :current_user_id, :now; :sale_id comes from the event.
INSERT INTO inventory_stock_movement
    (id, hub_id, location_id, product_id, movement_type, qty, stock_after,
     reference, is_deleted, created_by, created_at)
SELECT :sale_id || ':void:' || m.product_id, :hub_id,
       :hub_id || ':default',
       m.product_id, 'void',
       SUM(-m.qty), p.stock + SUM(-m.qty),
       :sale_id, 0, :current_user_id, :now
FROM inventory_stock_movement m
JOIN inventory_product p
  ON p.id = m.product_id AND p.hub_id = m.hub_id
WHERE m.hub_id = :hub_id
  AND m.reference = :sale_id
  AND m.movement_type = 'sale'
  AND m.is_deleted = 0
  AND p.is_deleted = 0
  AND NOT EXISTS (
      SELECT 1 FROM inventory_void_restock v
      WHERE v.hub_id = :hub_id AND v.sale_id = :sale_id
  )
GROUP BY m.product_id, p.id, p.stock
HAVING SUM(-m.qty) > 0
ON CONFLICT (id) DO NOTHING;
