-- ADR-0147: el umbral por producto es una cantidad en la misma unidad y escala 10⁶ que `stock`.
UPDATE inventory_product
SET low_stock_threshold = low_stock_threshold * 1000000;

ALTER TABLE inventory_product
ALTER COLUMN low_stock_threshold SET DEFAULT 10000000;
