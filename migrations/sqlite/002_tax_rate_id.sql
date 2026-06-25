-- Inventory · 002 (SQLite) — ADR-0066: el IVA del producto/categoría es una REFERENCIA
-- a un `taxes_rate` (módulo taxes), no un % suelto ni una "clase". Renombramos el campo
-- `tax_class_id` → `tax_rate_id` (mismo tipo TEXT) para que el nombre refleje que apunta a
-- `taxes_rate.id`. Migración ADITIVA (inventory ya está instalado en hubs → NO se edita 001).
-- RENAME COLUMN: SQLite ≥ 3.25.
ALTER TABLE inventory_product  RENAME COLUMN tax_class_id TO tax_rate_id;
ALTER TABLE inventory_category RENAME COLUMN tax_class_id TO tax_rate_id;
