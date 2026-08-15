-- Mapa producto→categoría (M2M) para que el POS filtre el catálogo por categoría en cliente.
-- Plano y portable (sin GROUP_CONCAT): una fila por (product_id, category_id) de productos
-- activos del hub. Runtime inyecta :hub_id; NO lleva ORDER BY / LIMIT / `;`.
SELECT pc.product_id, pc.category_id
FROM inventory_product_categories pc
JOIN inventory_product p ON p.id = pc.product_id AND p.hub_id = :hub_id
WHERE p.hub_id = :hub_id AND p.is_deleted = 0 AND p.is_active = 1
