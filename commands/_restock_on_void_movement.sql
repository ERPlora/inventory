-- Restitución de stock al ANULAR una venta (listener de `sale.voided`, ADR-0073) — HOJA 1/3.
-- inventory#28/QA-PG: cada fichero del `sql[]` del command se ejecuta como UN prepared
-- statement (`cmd.sql.iter()` → una op por hoja, todas en la MISMA transacción). Postgres
-- RECHAZA meter varias sentencias en un solo prepared statement ("cannot insert multiple
-- commands into a prepared statement"); SQLite lo toleraba, por eso el bug solo se veía en
-- Hub Cloud y difería toda la entrega de `sale.voided` (ni reposición ni extorno de caja).
-- La restitución va troceada en 3 hojas single-statement, en este ORDEN (importa):
--   1) este movimiento del ledger, 2) el UPDATE de stock, 3) el marcador de idempotencia.
--
-- Movimiento `void` por producto restituido (inventory#7): id DETERMINISTA
-- `<sale_id>:void:<product_id>` (idempotente por PK ante reentregas, además del marcador).
-- Se inserta ANTES del UPDATE para capturar el saldo PREVIO (`p.stock + SUM`), con las
-- MISMAS condiciones que el UPDATE (incluido el marcador `inventory_void_restock`).
--
-- Runtime inyecta :hub_id, :current_user_id, :now; :sale_id viene del evento.
INSERT INTO inventory_stock_movement
    (id, hub_id, location_id, product_id, movement_type, qty, stock_after,
     reference, is_deleted, created_by, created_at)
SELECT :sale_id || ':void:' || li.product_id, :hub_id,
       :hub_id || ':default',
       li.product_id, 'void',
       SUM(li.quantity), p.stock + SUM(li.quantity),
       :sale_id, 0, :current_user_id, :now
FROM sales_sale_item li
JOIN inventory_product p
  ON p.id = li.product_id AND p.hub_id = li.hub_id
WHERE li.sale_id = :sale_id AND li.hub_id = :hub_id
  AND li.is_service = 0 AND li.product_id IS NOT NULL
  AND p.is_deleted = 0 AND p.product_type != 'service'
  AND NOT EXISTS (
      SELECT 1 FROM inventory_void_restock m
      WHERE m.hub_id = :hub_id AND m.sale_id = :sale_id
  )
GROUP BY li.product_id, p.id, p.stock
ON CONFLICT (id) DO NOTHING;
