-- Recuento / corrección ABSOLUTA del stock (inventory#7): fija el valor contado.
-- Fin de la ambigüedad absoluto-vs-delta del contrato viejo (el doc decía absoluto,
-- el SQL aplicaba delta): `stock.adjust` = valor absoluto + motivo obligatorio;
-- los deltas son `stock.decrease` / `stock.receive`. El movimiento `count` con la
-- diferencia lo inserta `_movement_on_adjust.sql` (mismo sql[], misma transacción).
-- Un ajuste manual es una acción EXPLÍCITA: se aplica aunque track_stock = 0.
UPDATE inventory_product
SET stock = :stock,
    updated_by = :current_user_id, updated_at = :now
WHERE id = :product_id AND hub_id = :hub_id AND is_deleted = 0
  AND product_type != 'service';
