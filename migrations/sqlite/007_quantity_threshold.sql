-- ADR-0147: el umbral por producto es una cantidad en la misma unidad y escala 10⁶ que `stock`.
-- La migración 006 reescaló el saldo pero dejó el umbral histórico en unidades lógicas, por lo que
-- `stock <= low_stock_threshold` dejó de comparar magnitudes equivalentes.
UPDATE inventory_product
SET low_stock_threshold = low_stock_threshold * 1000000;
