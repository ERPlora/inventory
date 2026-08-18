-- Inserción de un producto usada por los handlers WASM batch (bulk_create / receive_stock
-- no la usa, pero bulk_create sí). El handler aporta :product_id (de new_ids), nombre, sku,
-- precio, etc. Runtime inyecta :hub_id, :current_user_id, :now.
INSERT INTO inventory_product
  (id, hub_id, name, sku, ean13, description, product_type, price, cost, stock, unit_code, price_quantity_value, pricing_unit_code,
   low_stock_threshold, tax_category_key, image, is_active, track_stock,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:product_id, :hub_id, :name, :sku, :ean13, :description, :product_type, :price, :cost, :stock, COALESCE(:unit_code,'ud'), COALESCE(:price_quantity_value,1000000), COALESCE(:pricing_unit_code,'ud'),
   :low_stock_threshold, :tax_category_key, :image, 1, CAST(:track_stock AS INTEGER),
   0, :current_user_id, :current_user_id, :now, :now);
