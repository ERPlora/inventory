-- Movimiento del ledger para `stock.decrease` (inventory#7). Se ejecuta ANTES del
-- UPDATE (mismo sql[], misma transacción) para capturar el saldo previo, y replica
-- EXACTAMENTE las guardas del UPDATE (modos de #6): si el descuento no va a aplicarse
-- (tracking off / sobreventa no permitida), aquí tampoco se inserta — el ledger solo
-- registra lo que OCURRIÓ. Tipo: `sale` si viene del listener de venta (con
-- referencia al documento), `decrease` si es un descuento directo.
--
-- inventory#28/QA-PG: :sale_id es opcional (NULL en un descuento directo) y se usa en una
-- condición (`CASE WHEN :sale_id IS NULL`). En un `INSERT ... SELECT` Postgres NO propaga
-- el tipo de la columna destino (`reference` TEXT) a un parámetro suelto del SELECT, así que
-- con la condición typeless no puede inferir su tipo → 42P08 "could not determine data type
-- of parameter". Se envuelve en `CAST(:sale_id AS TEXT)` (id de documento) para fijarlo.
-- SQLite no exige tipado, por eso el fallo solo aparecía en Hub Cloud.
INSERT INTO inventory_stock_movement
    (id, hub_id, location_id, product_id, movement_type, qty, stock_after,
     reason, reference, is_deleted, created_by, created_at)
SELECT :new_id, :hub_id,
       COALESCE(:location_id, :hub_id || ':default'),
       p.id,
       CASE WHEN CAST(:sale_id AS TEXT) IS NULL THEN 'decrease' ELSE 'sale' END,
       0 - :qty, p.stock - :qty,
       :reason, CAST(:sale_id AS TEXT), 0, :current_user_id, :now
FROM inventory_product p
WHERE p.id = :product_id AND p.hub_id = :hub_id AND p.is_deleted = 0
  AND p.product_type != 'service'
  AND COALESCE((SELECT s.track_stock
                FROM inventory_settings s
                WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 1) = 1
  AND (COALESCE((SELECT s.allow_sell_without_stock
                 FROM inventory_settings s
                 WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 0) = 1
       OR p.stock >= :qty);
