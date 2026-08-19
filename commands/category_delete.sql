-- Soft-delete de categoría. Segunda mitad del borrado: la primera es
-- `category_unlink_products.sql`, que suelta los productos en esta misma transacción.
--
-- El legacy BLOQUEABA el borrado si había productos activos vinculados. Esa política se cambió
-- (inventory#8, decisión de mercado del 2026-08-19): no se bloquea, se desvincula. El motivo
-- está en la hoja de arriba. Portado de CategoryService.delete_category.
UPDATE inventory_category
SET is_active = 0, is_deleted = 1, deleted_at = :now,
    updated_by = :current_user_id, updated_at = :now
WHERE id = :category_id AND hub_id = :hub_id;
