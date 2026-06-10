-- inventory.settings.get — ajustes del hub (singleton por hub_id). Runtime inyecta :hub_id.
-- Scoping obligatorio por contrato de fila §2.5 (defensa multi-tenant): solo la fila del hub.
SELECT allow_sell_without_stock, low_stock_threshold, track_stock
FROM inventory_settings
WHERE hub_id = :hub_id AND is_deleted = 0
LIMIT 1;
