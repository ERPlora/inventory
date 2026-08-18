-- STOCK LEVELS of the active catalogue (inventory#47): what the stock handlers need to decide a
-- low-stock CROSSING without touching the DB — previous balance, per-product threshold and the
-- EFFECTIVE `track_stock` (own flag, or the hub setting when NULL; services never track, #48).
-- Pre-loaded (`reads`, ADR-0069) by `decrease_on_sale` and `receive_stock`, whose lines may name
-- any product, so this is the WHOLE catalogue on purpose (a paginated `list` would hand the
-- handler the first page only, hub#650). Narrow rows: id, sku/name for the event payload, the two
-- quantities (10⁶ fixed-point, ADR-0147), the flag and the type. Runtime injects :hub_id.
SELECT id,
       sku,
       name,
       product_type,
       stock,
       low_stock_threshold,
       CASE WHEN product_type = 'service' THEN 0
            ELSE COALESCE(track_stock,
                          (SELECT s.track_stock FROM inventory_settings s
                           WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 1)
       END AS track_stock
FROM inventory_product
WHERE hub_id = :hub_id
  AND is_deleted = 0
  AND is_active = 1;
