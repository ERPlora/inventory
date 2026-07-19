-- La unidad y su INCREMENTO para un producto concreto (ADR-0147 §2.2). Runtime inyecta :hub_id.
--
-- Existe para poder RECHAZAR una cantidad fuera de la rejilla, y solo es posible desde que las
-- `reads` admiten parámetros (ADR-0069 fase 2): antes se ejecutaban con `Params::new()`, así que un
-- handler podía pedir «todas las unidades» pero no «la de ESTE producto».
--
-- Dónde NO podía vivir esta validación, y por qué:
--   * en el SQL — un WHERE que no casa ninguna fila responde `ok`, no error;
--   * pidiéndosela al cliente — rompe que el servidor sea la autoridad.
--
-- LEFT JOIN a propósito: un producto cuya unidad no esté en el registro no puede quedarse sin
-- poder venderse. Sin fila de unidad, el handler degrada y no valida rejilla (el guard de stock
-- del SQL sigue estando).
SELECT p.id AS product_id, p.unit_code,
       u.increment_value, u.name AS unit_name, u.name_es AS unit_name_es
FROM inventory_product p
LEFT JOIN inventory_unit u
       ON u.code = p.unit_code AND u.hub_id = p.hub_id AND u.is_deleted = 0
WHERE p.id = :product_id AND p.hub_id = :hub_id AND p.is_deleted = 0;
