-- inventory.settings.get — ajustes del módulo (el runtime inyecta hub_id).
SELECT allow_sell_without_stock, low_stock_threshold, track_stock
FROM inventory_settings
LIMIT 1;
