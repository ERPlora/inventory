-- Libro de movimientos (inventory#7): historial inmutable con el producto joineado
-- (nombre/sku) para pintarse sin N+1. La base NO lleva ORDER BY/LIMIT (motor list).
SELECT m.id, m.product_id, p.name AS product_name, p.sku,
       m.movement_type, m.qty, m.stock_after, m.reason, m.reference,
       m.unit_cost, m.location_id, m.created_by, m.created_at
FROM inventory_stock_movement m
LEFT JOIN inventory_product p ON p.id = m.product_id AND p.hub_id = m.hub_id
WHERE m.hub_id = :hub_id AND m.is_deleted = 0
