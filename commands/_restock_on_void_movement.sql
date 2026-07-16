-- inventory#7/QA-PG: cada fichero de sql[] se ejecuta como UN prepared statement.
-- Postgres RECHAZA multi-statement ("cannot insert multiple commands into a prepared
-- statement"); SQLite lo tolera — por eso este bug solo se vio en Hub Cloud. La
-- restitución del void va troceada en 3 ficheros, misma transacción del command.
-- Restitución de stock al ANULAR una venta (listener de `sale.voided`, ADR-0073).
-- Reverso de `stock.decrease_on_sale`: suma de nuevo a `inventory_product.stock` las
-- cantidades que la venta descontó, leyendo las LÍNEAS de la venta (`sales_sale_item`,
-- la misma tabla que expone `sales.lines`). Salta servicios (`is_service=1`) y líneas
-- sin `product_id`, igual que el descuento original.
--
-- IDEMPOTENTE (defensa en profundidad sobre el marcador `_event_delivery` del runtime):
-- la restitución solo se aplica si la venta NO está ya en `inventory_void_restock`; el
-- INSERT del marcador (ON CONFLICT DO NOTHING) cierra la operación. Una reentrega del
-- evento (mismo id → bloqueada por `_event_delivery`; id distinto → bloqueada por el
-- marcador propio) no vuelve a sumar stock.
--
-- Runtime inyecta :hub_id, :current_user_id, :now; :sale_id viene del evento.
-- Movimiento `void` por producto restituido (inventory#7): id DETERMINISTA
-- `<sale_id>:void:<product_id>` (idempotente por PK ante reentregas, además del
-- marcador). Se inserta ANTES del UPDATE para capturar el saldo previo, con las
-- MISMAS condiciones (incluido el marcador).
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
