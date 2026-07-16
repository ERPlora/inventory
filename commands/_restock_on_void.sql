-- inventory#7/QA-PG: cada fichero de sql[] se ejecuta como UN prepared statement.
-- Postgres RECHAZA multi-statement ("cannot insert multiple commands into a prepared
-- statement"); SQLite lo tolera — por eso este bug solo se vio en Hub Cloud. La
-- restitución del void va troceada en 3 ficheros, misma transacción del command.

UPDATE inventory_product
SET stock = stock + (
        SELECT COALESCE(SUM(li.quantity), 0)
        FROM sales_sale_item li
        WHERE li.sale_id = :sale_id
          AND li.hub_id = :hub_id
          AND li.product_id = inventory_product.id
          AND li.is_service = 0
    ),
    updated_at = :now
WHERE hub_id = :hub_id
  AND is_deleted = 0
  AND product_type != 'service'
  AND id IN (
      SELECT li.product_id FROM sales_sale_item li
      WHERE li.sale_id = :sale_id AND li.hub_id = :hub_id
        AND li.is_service = 0 AND li.product_id IS NOT NULL
  )
  AND NOT EXISTS (
      SELECT 1 FROM inventory_void_restock m
      WHERE m.hub_id = :hub_id AND m.sale_id = :sale_id
  );
