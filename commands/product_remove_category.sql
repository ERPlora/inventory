-- Desliga un producto de una categoría. Misma guarda de tenant que el alta: la M2M no tiene
-- `hub_id` propio, así que se comprueba contra el producto (que sí lo tiene).
DELETE FROM inventory_product_categories
 WHERE product_id = :product_id
   AND category_id = :category_id
   AND EXISTS (
       SELECT 1 FROM inventory_product p
        WHERE p.id = :product_id AND p.hub_id = :hub_id);
