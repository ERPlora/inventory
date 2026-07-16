-- Alta de producto. Runtime inyecta :new_id, :hub_id, :current_user_id, :now.
-- Portado de ProductService.create_product.
-- Umbral de stock bajo (precedencia resuelta en inventory#6): el umbral POR PRODUCTO
-- siempre manda; el GLOBAL de settings es su semilla de creación — un alta sin
-- `low_stock_threshold` explícito (bind NULL) hereda el global del hub (fallback 10).
INSERT INTO inventory_product
  (id, hub_id, name, sku, ean13, description, product_type, price, cost, stock,
   low_stock_threshold, tax_category_key, image, is_active,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :name, :sku, :ean13, :description, :product_type, :price, :cost, :stock,
   COALESCE(:low_stock_threshold,
            (SELECT s.low_stock_threshold FROM inventory_settings s
             WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 10),
   :tax_category_key, :image, 1,
   0, :current_user_id, :current_user_id, :now, :now);
