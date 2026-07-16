-- inventory#7/QA-PG: cada fichero de sql[] se ejecuta como UN prepared statement.
-- Postgres RECHAZA multi-statement ("cannot insert multiple commands into a prepared
-- statement"); SQLite lo tolera — por eso este bug solo se vio en Hub Cloud. La
-- restitución del void va troceada en 3 ficheros, misma transacción del command.

INSERT INTO inventory_void_restock (hub_id, sale_id, created_at)
VALUES (:hub_id, :sale_id, :now)
ON CONFLICT (hub_id, sale_id) DO NOTHING;
