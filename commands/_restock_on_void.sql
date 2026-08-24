-- Stock restitution when a sale is VOIDED (listener of `sale.voided`, ADR-0073) — SHEET 2/3.
-- inventory#28/QA-PG: single-statement sheet (see `_restock_on_void_movement.sql` for why it is
-- split). Reverse of `stock.decrease_on_sale`: adds back to `inventory_product.stock` exactly what
-- this sale took out, read from THIS module's ledger (`inventory_stock_movement`, the `sale`
-- movements referencing the sale) -- never from the sale lines. See sheet 1/3 for the two failures
-- that source had: a combo's components are invisible in the lines (inventory#69, ADR-0381), and a
-- decrease rejected for insufficient stock was restocked anyway, inventing stock.
--
-- `qty` of a `sale` movement is negative, so the restitution is `SUM(-qty)`, in 10⁶ fixed point
-- (ADR-0147). A product with no `sale` movement for this sale is not touched at all.
--
-- IDEMPOTENT (defence in depth over the runtime's `_event_delivery` marker): the restitution only
-- applies if the sale is NOT already in `inventory_void_restock` (the marker is inserted by sheet
-- 3/3, AFTER this UPDATE). It goes AFTER the movement (sheet 1/3), which captures the previous
-- balance, and both share the same transaction.
-- Runtime injects :hub_id, :current_user_id, :now; :sale_id comes from the event.
UPDATE inventory_product
SET stock = stock + (
        SELECT COALESCE(SUM(-m.qty), 0)
        FROM inventory_stock_movement m
        WHERE m.hub_id = :hub_id
          AND m.reference = :sale_id
          AND m.movement_type = 'sale'
          AND m.is_deleted = 0
          AND m.product_id = inventory_product.id
    ),
    updated_at = :now
WHERE hub_id = :hub_id
  AND is_deleted = 0
  AND id IN (
      SELECT m.product_id FROM inventory_stock_movement m
      WHERE m.hub_id = :hub_id AND m.reference = :sale_id
        AND m.movement_type = 'sale' AND m.is_deleted = 0
  )
  AND NOT EXISTS (
      SELECT 1 FROM inventory_void_restock v
      WHERE v.hub_id = :hub_id AND v.sale_id = :sale_id
  );
