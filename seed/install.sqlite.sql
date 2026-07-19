-- Seed canónico del registro de UNIDADES (ADR-0147). DML IDEMPOTENTE por hub: el instalador lo
-- aplica tras migrar, con :hub_id/:now/:current_user_id inyectados. Re-ejecutable sin duplicar
-- (WHERE NOT EXISTS por la clave natural `code`). Mismo SQL en SQLite y Postgres.
--
-- Dos cosas que no son decorativas:
--
-- 1. El FACTOR va como fracción exacta `num/den` hacia la referencia de su categoría. `1 min = 1/60 h`
--    no tiene decimal finito; aproximarlo mete error en cada conversión. SAP guarda así sus
--    conversiones (MARM-UMREZ/UMREN, dos enteros) por este mismo motivo.
-- 2. El INCREMENTO es el escalón permitido, y es INDEPENDIENTE de la escala global. Odoo tenía
--    escalón por unidad, en la 19 lo fundió con la precisión global y perdió el escalón arbitrario
--    (0,25 h, «se vende de 6 en 6»). Aquí conviven.
--
-- Nombres en inglés canónico + traducción al español (ADR-0055).

-- ── Conteo ── la referencia es la unidad suelta, y no se parte.
INSERT INTO inventory_unit (id, hub_id, code, name, name_es, category, factor_num, factor_den, increment_value, is_reference, sort_order, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT (:hub_id || '|unit|ud'), :hub_id, 'ud', 'Unit', 'Unidad', 'count', 1, 1, 1000000, 1, 10, 0, :current_user_id, :current_user_id, :now, :now
WHERE NOT EXISTS (SELECT 1 FROM inventory_unit WHERE hub_id = :hub_id AND code = 'ud');

-- ── Masa ── referencia el kilo, con escalón de GRAMO: es lo que da una báscula de mostrador.
INSERT INTO inventory_unit (id, hub_id, code, name, name_es, category, factor_num, factor_den, increment_value, is_reference, sort_order, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT (:hub_id || '|unit|kg'), :hub_id, 'kg', 'Kilogram', 'Kilogramo', 'mass', 1, 1, 1000, 1, 20, 0, :current_user_id, :current_user_id, :now, :now
WHERE NOT EXISTS (SELECT 1 FROM inventory_unit WHERE hub_id = :hub_id AND code = 'kg');

-- 1 g = 1/1000 kg. Escalón 1 g: nadie vende décimas de gramo en un bar.
INSERT INTO inventory_unit (id, hub_id, code, name, name_es, category, factor_num, factor_den, increment_value, is_reference, sort_order, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT (:hub_id || '|unit|g'), :hub_id, 'g', 'Gram', 'Gramo', 'mass', 1, 1000, 1000000, 0, 21, 0, :current_user_id, :current_user_id, :now, :now
WHERE NOT EXISTS (SELECT 1 FROM inventory_unit WHERE hub_id = :hub_id AND code = 'g');

-- 1 t = 1000 kg. Escalón 0,001 t = 1 kg.
INSERT INTO inventory_unit (id, hub_id, code, name, name_es, category, factor_num, factor_den, increment_value, is_reference, sort_order, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT (:hub_id || '|unit|t'), :hub_id, 't', 'Tonne', 'Tonelada', 'mass', 1000, 1, 1000, 0, 22, 0, :current_user_id, :current_user_id, :now, :now
WHERE NOT EXISTS (SELECT 1 FROM inventory_unit WHERE hub_id = :hub_id AND code = 't');

-- ── Volumen ── referencia el litro, escalón de mililitro.
INSERT INTO inventory_unit (id, hub_id, code, name, name_es, category, factor_num, factor_den, increment_value, is_reference, sort_order, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT (:hub_id || '|unit|l'), :hub_id, 'l', 'Litre', 'Litro', 'volume', 1, 1, 1000, 1, 30, 0, :current_user_id, :current_user_id, :now, :now
WHERE NOT EXISTS (SELECT 1 FROM inventory_unit WHERE hub_id = :hub_id AND code = 'l');

INSERT INTO inventory_unit (id, hub_id, code, name, name_es, category, factor_num, factor_den, increment_value, is_reference, sort_order, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT (:hub_id || '|unit|ml'), :hub_id, 'ml', 'Millilitre', 'Mililitro', 'volume', 1, 1000, 1000000, 0, 31, 0, :current_user_id, :current_user_id, :now, :now
WHERE NOT EXISTS (SELECT 1 FROM inventory_unit WHERE hub_id = :hub_id AND code = 'ml');

-- ── Tiempo ── referencia el MINUTO, no la hora: así una cita de 20 minutos es exacta.
-- Con la hora como referencia, 20 min = 1/3 periódico y habría que rechazarla (ADR-0147 §2.2).
INSERT INTO inventory_unit (id, hub_id, code, name, name_es, category, factor_num, factor_den, increment_value, is_reference, sort_order, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT (:hub_id || '|unit|min'), :hub_id, 'min', 'Minute', 'Minuto', 'time', 1, 1, 1000000, 1, 40, 0, :current_user_id, :current_user_id, :now, :now
WHERE NOT EXISTS (SELECT 1 FROM inventory_unit WHERE hub_id = :hub_id AND code = 'min');

-- 1 h = 60 min, y se factura en CUARTOS. Es el caso que justifica separar escala e incremento:
-- ninguna precisión decimal global puede expresar «múltiplos de 0,25».
INSERT INTO inventory_unit (id, hub_id, code, name, name_es, category, factor_num, factor_den, increment_value, is_reference, sort_order, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT (:hub_id || '|unit|h'), :hub_id, 'h', 'Hour', 'Hora', 'time', 60, 1, 250000, 0, 41, 0, :current_user_id, :current_user_id, :now, :now
WHERE NOT EXISTS (SELECT 1 FROM inventory_unit WHERE hub_id = :hub_id AND code = 'h');
