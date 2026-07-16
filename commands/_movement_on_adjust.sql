-- Movimiento `count` para `stock.adjust` (inventory#7): el ajuste es ABSOLUTO (recuento)
-- y el movimiento registra la DIFERENCIA contra el saldo previo. Un recuento sin cambio
-- (p.stock = :stock) no ensucia el ledger. El motivo es obligatorio (schema). Se ejecuta
-- ANTES del UPDATE, en la misma transacción.
INSERT INTO inventory_stock_movement
    (id, hub_id, location_id, product_id, movement_type, qty, stock_after,
     reason, is_deleted, created_by, created_at)
SELECT :new_id, :hub_id,
       COALESCE(:location_id, :hub_id || ':default'),
       p.id, 'count',
       :stock - p.stock, :stock,
       :reason, 0, :current_user_id, :now
FROM inventory_product p
WHERE p.id = :product_id AND p.hub_id = :hub_id AND p.is_deleted = 0
  AND p.product_type != 'service'
  AND p.stock != :stock;
