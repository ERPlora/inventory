-- Edición de producto (campos editables; la UI envía el conjunto completo, Tier 0/1).
-- Portado de ProductService.update_product (name/price/cost/low_stock_threshold/is_active);
-- tax_category_key añadido (ADR-0066: el IVA del producto es una referencia a taxes_rate.id).
UPDATE inventory_product SET
  name = :name,
  price = :price,
  cost = :cost,
  low_stock_threshold = :low_stock_threshold,
  tax_category_key = :tax_category_key,
  is_active = :is_active,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :product_id AND hub_id = :hub_id AND is_deleted = 0;
