-- Garantiza la ubicación lógica PREDETERMINADA del hub (inventory#7, MVP ubicación
-- única): id determinista `<hub_id>:default`, creada de forma perezosa por el primer
-- command que mueve stock. Idempotente. Se antepone en el sql[] de todos los commands
-- que escriben movimientos.
INSERT INTO inventory_location (id, hub_id, name, is_default, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :hub_id || ':default', :hub_id, 'General', 1, 0, :current_user_id, :current_user_id, :now, :now
WHERE NOT EXISTS (
    SELECT 1 FROM inventory_location
    WHERE hub_id = :hub_id AND is_default = 1 AND is_deleted = 0
);
