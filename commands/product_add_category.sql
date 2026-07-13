-- Liga un producto a una categoría (M2M `inventory_product_categories`, la que consulta el TPV
-- para agrupar la carta). La tabla es un join puro SIN `hub_id`, así que el runtime no puede
-- inyectar el tenant: la guarda la pone este SELECT — ambos extremos deben ser del hub del
-- contexto. Idempotente vía NOT EXISTS (portable SQLite/Postgres; `ON CONFLICT` no lo es).
INSERT INTO inventory_product_categories (product_id, category_id)
SELECT p.id, c.id
  FROM inventory_product p
  JOIN inventory_category c ON c.hub_id = p.hub_id
 WHERE p.id = :product_id
   AND c.id = :category_id
   AND p.hub_id = :hub_id
   AND p.is_deleted = 0
   AND c.is_deleted = 0
   AND NOT EXISTS (
       SELECT 1 FROM inventory_product_categories pc
        WHERE pc.product_id = :product_id AND pc.category_id = :category_id);
