-- Proyección base de productos del hub. Runtime inyecta :hub_id.
-- Es una query de LISTA: el runtime compone búsqueda/filtro/orden/paginación a partir del
-- bloque `list` de module.json. NO lleva ORDER BY / LIMIT / `;` aquí (los añade el runtime).
-- Toda columna que se quiera ordenar o filtrar debe estar proyectada.
SELECT id, name, sku, price, cost, stock, is_active, product_type, created_at
FROM inventory_product
WHERE hub_id = :hub_id AND is_deleted = 0
