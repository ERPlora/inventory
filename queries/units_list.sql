-- Registro de unidades de medida del hub (ADR-0147). Runtime inyecta :hub_id.
-- `factor_num/factor_den` es una FRACCIÓN EXACTA hacia la referencia de la categoría — 1 min = 1/60 h
-- no tiene decimal finito, y aproximarlo mete error en cada conversión.
-- `increment_value` (escala 10⁶) es el escalón permitido, INDEPENDIENTE de la escala: es lo que
-- permite expresar «múltiplos de 0,25 h», que ninguna precisión decimal global puede.
SELECT id, code, name, name_es, category,
       factor_num, factor_den, increment_value, is_reference, sort_order
FROM inventory_unit
WHERE hub_id = :hub_id AND is_deleted = 0
ORDER BY sort_order ASC, code ASC;
