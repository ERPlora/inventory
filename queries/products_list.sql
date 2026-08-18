-- Base projection of the hub's products. The runtime injects :hub_id.
-- This is a LIST query: the runtime composes search/filter/sort/pagination from the `list` block
-- in module.json. No ORDER BY / LIMIT / `;` here (the runtime adds them).
-- Every column meant to be sorted or filtered must be projected.
--
-- `needs_tax_setup` marks the products that predate inventory#38, when `tax_category_key` was
-- optional: they do not know how they are taxed, and the sale only fails at the till. They are NOT
-- migrated — assigning them a default category would be making up fiscal data — so they are FLAGGED
-- instead, and the list shows a third state («not configured») that can be filtered to review them
-- in one go. The empty string is the same hole as NULL, so both count.
SELECT id, name, sku, price, cost, stock, unit_code, price_quantity_value, pricing_unit_code, low_stock_threshold, tax_category_key,
       CASE WHEN tax_category_key IS NULL OR tax_category_key = '' THEN 1 ELSE 0 END AS needs_tax_setup,
       is_active, product_type, image, created_at,
       track_stock  -- crudo 1/0/NULL (inventory#48): NULL = sigue el ajuste del hub
FROM inventory_product
WHERE hub_id = :hub_id AND is_deleted = 0
