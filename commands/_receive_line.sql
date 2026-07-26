-- Incrementa el stock de un producto existente por :qty (recepción de mercancía).
-- Lo emite el handler WASM receive_stock, una op por línea casada por id. Si :unit_cost
-- viene informado, también actualiza el coste. Portado de ProductService.receive_stock.
--
-- inventory#28/QA-PG: :unit_cost es opcional (schema `["integer","null"]`) y aquí se usa
-- SOLO en una condición (`IS NOT NULL`). Con el bind NULL Postgres no puede inferir su tipo
-- desde ese contexto → 42P08 "could not determine data type of parameter". Se envuelve en
-- `CAST(:unit_cost AS INTEGER)` (coste = céntimos, columna INTEGER) para fijar el tipo.
-- SQLite no exige tipado, por eso el fallo solo aparecía en Hub Cloud.
UPDATE inventory_product
SET stock = stock + :qty,
    cost = CASE WHEN CAST(:unit_cost AS INTEGER) IS NOT NULL
                THEN CAST(:unit_cost AS INTEGER) ELSE cost END,
    updated_by = :current_user_id, updated_at = :now
WHERE id = :product_id AND hub_id = :hub_id AND is_deleted = 0;
