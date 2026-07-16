-- Descuento de stock de UN producto por :qty, GOBERNADO por los ajustes del hub
-- (inventory#6 — modos operativos, frontera ADR-0135):
--   * track_stock = 0            → NO-OP: sin movimientos automáticos.
--   * allow_sell_without_stock=1 → descuenta SIEMPRE y el saldo resultante se representa
--                                  tal cual (negativo incluido) — nunca truncado a 0.
--   * allow_sell_without_stock=0 → solo descuenta con stock suficiente (stock >= :qty);
--                                  si no, 0 filas afectadas = RECHAZO ATÓMICO. El guard
--                                  vive en el WHERE, dentro de la transacción: cubre
--                                  concurrencia y cualquier caller (POS, API, eventos).
-- Sin fila de settings → defaults del schema vía COALESCE (track=1, allow=0).
-- Los servicios nunca descuentan stock (product_type != 'service').
-- Sustituye al truncado silencioso `CASE WHEN <0 THEN 0` (bug de #6).
-- Runtime inyecta :hub_id, :now; :product_id y :qty vienen del payload.
UPDATE inventory_product
SET stock = stock - :qty,
    updated_at = :now
WHERE id = :product_id AND hub_id = :hub_id AND is_deleted = 0
  AND product_type != 'service'
  AND COALESCE((SELECT s.track_stock
                FROM inventory_settings s
                WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 1) = 1
  AND (COALESCE((SELECT s.allow_sell_without_stock
                 FROM inventory_settings s
                 WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 0) = 1
       OR stock >= :qty);
