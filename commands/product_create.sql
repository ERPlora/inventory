-- Alta de producto. Runtime inyecta :new_id, :hub_id, :current_user_id, :now.
-- Portado de ProductService.create_product.
-- Umbral de stock bajo (precedencia resuelta en inventory#6): el umbral POR PRODUCTO
-- siempre manda; el GLOBAL de settings es su semilla de creación — un alta sin
-- `low_stock_threshold` explícito (bind NULL) hereda el global del hub, que sigue siendo un ajuste
-- humano en unidades lógicas; al copiarlo al producto se convierte a escala 10⁶ (fallback 10).
-- `track_stock` (inventory#48): 1/0 si el alta lo dice, NULL si no — y NULL significa «sigue el
-- ajuste del hub» (tri-estado ADR-0210), no se resuelve al crear: si el hub cambia, el artículo
-- le sigue. inventory#28/QA-PG: CAST para que Postgres tipe el bind NULL.
INSERT INTO inventory_product
  (id, hub_id, name, sku, ean13, description, product_type, price, cost, stock, unit_code, price_quantity_value, pricing_unit_code,
   low_stock_threshold, tax_category_key, image, is_active, track_stock,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :name, :sku, :ean13, :description, :product_type, :price, :cost, :stock, COALESCE(:unit_code,'ud'), COALESCE(:price_quantity_value,1000000), COALESCE(:pricing_unit_code,'ud'),
   COALESCE(:low_stock_threshold,
            (SELECT s.low_stock_threshold * 1000000 FROM inventory_settings s
             WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 10000000),
   :tax_category_key, :image, 1, CAST(:track_stock AS INTEGER),
   0, :current_user_id, :current_user_id, :now, :now);
