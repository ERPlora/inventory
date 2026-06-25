-- Alta de categoría. Runtime inyecta :new_id, :hub_id, :current_user_id, :now.
-- Portado de CategoryService.create_category (slug auto si vacío → lo calcula el SDK/handler).
-- tax_rate_id añadido (ADR-0066: el IVA de la categoría es una referencia a taxes_rate.id;
-- el adaptador bindea NULL si falta = tipo por defecto del hub).
INSERT INTO inventory_category
  (id, hub_id, name, slug, icon, color, description, "order", tax_rate_id, is_active,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :name, :slug, :icon, :color, :description, :order, :tax_rate_id, 1,
   0, :current_user_id, :current_user_id, :now, :now);
