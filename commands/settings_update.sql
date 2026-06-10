-- inventory.settings.update — upsert de los ajustes del hub (singleton: un registro por
-- hub_id, garantizado por uq_inventory_settings_hub). Runtime inyecta
-- :new_id/:hub_id/:current_user_id/:now. En el conflicto por hub_id sobrescribe los campos
-- editables y actualiza la auditoría (conserva id/created_*).
INSERT INTO inventory_settings
  (id, hub_id, allow_sell_without_stock, low_stock_threshold, track_stock,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :allow_sell_without_stock, :low_stock_threshold, :track_stock,
   0, :current_user_id, :current_user_id, :now, :now)
ON CONFLICT(hub_id) DO UPDATE SET
  allow_sell_without_stock = excluded.allow_sell_without_stock,
  low_stock_threshold      = excluded.low_stock_threshold,
  track_stock              = excluded.track_stock,
  is_deleted               = 0,
  deleted_at               = NULL,
  updated_by               = :current_user_id,
  updated_at               = :now;
