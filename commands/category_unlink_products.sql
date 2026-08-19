-- Desliga de la categoría a TODOS sus productos, en la misma transacción que la borra
-- (inventory#8). Es la primera mitad del borrado, no un extra: la política es DESVINCULAR —
-- los artículos siguen vivos y solo pierden esta categoría— y hasta ahora esa promesa no se
-- cumplía, solo se dejaba de ver: el soft-delete escondía la categoría de `categories.list` y las
-- filas de la M2M se quedaban ahí, sirviéndose por `inventory.product_categories` (el mapa con el
-- que el TPV filtra la carta) y esperando a que alguien reutilizara el id.
--
-- Por qué desvincular y no bloquear: lo decidió el mercado (2026-08-19, 9 referencias en
-- `architecture/modules/inventory.md`). Shopify, WooCommerce, Square, Lightspeed, Toast y Vagaro
-- sueltan la categoría y conservan los artículos; los dos que bloquean —Odoo y Business Central—
-- lo hacen porque en su modelo el artículo tiene UNA categoría obligatoria y no puede quedarse sin
-- ella. La nuestra es N:M y opcional, así que ese motivo no aplica.
--
-- La M2M es un join puro SIN `hub_id`, así que el tenant se comprueba contra la categoría (que sí
-- lo tiene) — la misma guarda que usan `product_add_category.sql` / `product_remove_category.sql`.
DELETE FROM inventory_product_categories
 WHERE category_id = :category_id
   AND EXISTS (
       SELECT 1 FROM inventory_category c
        WHERE c.id = :category_id AND c.hub_id = :hub_id);
