-- Productos FÍSICOS activos en o por debajo de su umbral de stock bajo.
-- El orden (stock asc) y la paginación los pone el RUNTIME desde el bloque `list` del manifest
-- (`default_sort`/`default_dir` + LIMIT/OFFSET). Aquí no van: el motor de listas envuelve este
-- SELECT como subconsulta, así que un LIMIT propio recortaría el conjunto ANTES de paginar
-- (inventory#57).
-- Portado de ProductService.list_low_stock (is_low_stock = stock <= low_stock_threshold).
-- Los servicios se excluyen (inventory#9): no tienen existencias que reponer.
-- Y los artículos que NO controlan stock (inventory#48, flag por artículo, NULL = hereda el hub)
-- tampoco: su saldo no significa nada, avisar de él sería ruido.
SELECT id, name, sku, stock, unit_code, price_quantity_value, pricing_unit_code, low_stock_threshold
FROM inventory_product
WHERE hub_id = :hub_id AND is_deleted = 0 AND is_active = 1
  AND product_type != 'service'
  AND COALESCE(track_stock,
               (SELECT s.track_stock FROM inventory_settings s
                WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 1) = 1
  AND stock <= low_stock_threshold
