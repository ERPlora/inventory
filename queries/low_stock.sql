-- Productos FÍSICOS activos en o por debajo de su umbral de stock bajo (orden stock asc).
-- Portado de ProductService.list_low_stock (is_low_stock = stock <= low_stock_threshold).
-- Los servicios se excluyen (inventory#9): no tienen existencias que reponer.
SELECT id, name, sku, stock, low_stock_threshold
FROM inventory_product
WHERE hub_id = :hub_id AND is_deleted = 0 AND is_active = 1
  AND product_type != 'service'
  AND stock <= low_stock_threshold
ORDER BY stock ASC
LIMIT 50;
