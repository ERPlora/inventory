-- Inventory · 003 (SQLite) — ADR-0085 (supersede ADR-0066): el enlace fiscal del
-- producto/categoría deja de ser una referencia a un `taxes_rate.id` y pasa a ser una
-- CLAVE DE CATEGORÍA FISCAL canónica (`tax_category_key`, p.ej. `product.generic`). El %
-- se resuelve en venta desde el país/región del hub + la categoría. Renombramos el campo
-- `tax_rate_id` → `tax_category_key` (mismo tipo TEXT, sin FK). Migración ADITIVA
-- (inventory ya está instalado en hubs → NO se edita 001/002). RENAME COLUMN: SQLite ≥ 3.25.
ALTER TABLE inventory_product  RENAME COLUMN tax_rate_id TO tax_category_key;
ALTER TABLE inventory_category RENAME COLUMN tax_rate_id TO tax_category_key;
