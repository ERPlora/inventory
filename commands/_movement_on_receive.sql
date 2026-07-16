-- Movimiento `reception` para `_receive_line` (inventory#7): registra la entrada con
-- coste unitario y referencia (albarán) ANTES del UPDATE de `_receive_line.sql`, en la
-- misma transacción y con las mismas condiciones.
INSERT INTO inventory_stock_movement
    (id, hub_id, location_id, product_id, movement_type, qty, stock_after,
     reference, unit_cost, is_deleted, created_by, created_at)
SELECT :new_id, :hub_id,
       COALESCE(:location_id, :hub_id || ':default'),
       p.id, 'reception',
       :qty, p.stock + :qty,
       :reference, :unit_cost, 0, :current_user_id, :now
FROM inventory_product p
WHERE p.id = :product_id AND p.hub_id = :hub_id AND p.is_deleted = 0;
