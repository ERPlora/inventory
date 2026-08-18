-- Un producto por id (scope hub_id). Portado de ProductService.get_product.
-- `track_stock` va CRUDO (1/0/NULL, inventory#48): la ficha necesita saber si el artículo hereda el
-- ajuste del hub (NULL) o lo fijó él; el valor efectivo lo resuelve quien lo consume (handler/UI).
SELECT id, name, sku, ean13, description, product_type, price, cost, stock, unit_code, price_quantity_value, pricing_unit_code,
       low_stock_threshold, tax_category_key, image, is_active, track_stock
FROM inventory_product
WHERE id = :product_id AND hub_id = :hub_id AND is_deleted = 0;
