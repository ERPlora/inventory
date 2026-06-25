-- Edición de categoría. Portado de CategoryService.update_category.
-- tax_rate_id añadido (ADR-0066: el IVA de la categoría es una referencia a taxes_rate.id).
UPDATE inventory_category SET
  name = :name,
  slug = :slug,
  icon = :icon,
  color = :color,
  description = :description,
  "order" = :order,
  tax_rate_id = :tax_rate_id,
  is_active = :is_active,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :category_id AND hub_id = :hub_id AND is_deleted = 0;
