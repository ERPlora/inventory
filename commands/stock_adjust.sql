-- Ajuste de stock por :delta (puede ser negativo). Por defecto no baja de 0;
-- el legacy permite negativo solo con allow_negative.
-- Portado de ProductService.adjust_stock. Runtime inyecta :hub_id, :current_user_id, :now.
-- Portable SQLite+Postgres: MAX() escalar no existe en Postgres (42883) → CASE WHEN.
UPDATE inventory_product
SET stock = CASE WHEN (stock + :delta) < 0 THEN 0 ELSE (stock + :delta) END,
    updated_by = :current_user_id, updated_at = :now
WHERE id = :product_id AND hub_id = :hub_id AND is_deleted = 0;
