-- Restitución de stock al ANULAR una venta (listener de `sale.voided`, ADR-0073) — HOJA 2/3.
-- inventory#28/QA-PG: hoja single-statement (ver `_restock_on_void_movement.sql` para el
-- porqué del troceo). Reverso de `stock.decrease_on_sale`: suma de nuevo a
-- `inventory_product.stock` las cantidades que la venta descontó, leyendo las LÍNEAS de la
-- venta (`sales_sale_item`, la misma tabla que expone `sales.lines`). Salta servicios
-- (`is_service=1`) y líneas sin `product_id`, igual que el descuento original.
--
-- IDEMPOTENTE (defensa en profundidad sobre el marcador `_event_delivery` del runtime):
-- la restitución solo se aplica si la venta NO está ya en `inventory_void_restock` (el
-- marcador lo inserta la hoja 3/3, DESPUÉS de este UPDATE). Va DESPUÉS del movimiento
-- (hoja 1/3), que captura el saldo previo; ambos comparten la misma transacción.
--
-- Runtime inyecta :hub_id, :current_user_id, :now; :sale_id viene del evento.
UPDATE inventory_product
SET stock = stock + (
        SELECT COALESCE(SUM(li.quantity), 0)
        FROM sales_sale_item li
        WHERE li.sale_id = :sale_id
          AND li.hub_id = :hub_id
          AND li.product_id = inventory_product.id
          AND li.is_service = 0
    ),
    updated_at = :now
WHERE hub_id = :hub_id
  AND is_deleted = 0
  AND product_type != 'service'
  AND id IN (
      SELECT li.product_id FROM sales_sale_item li
      WHERE li.sale_id = :sale_id AND li.hub_id = :hub_id
        AND li.is_service = 0 AND li.product_id IS NOT NULL
  )
  AND NOT EXISTS (
      SELECT 1 FROM inventory_void_restock m
      WHERE m.hub_id = :hub_id AND m.sale_id = :sale_id
  );
