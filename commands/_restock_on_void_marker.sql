-- Restitución de stock al ANULAR una venta (listener de `sale.voided`, ADR-0073) — HOJA 3/3.
-- inventory#28/QA-PG: hoja single-statement (ver `_restock_on_void_movement.sql`). Cierra la
-- operación insertando el marcador de idempotencia. Va DESPUÉS del movimiento y del UPDATE:
-- ambos llevan `NOT EXISTS (... inventory_void_restock ...)`, así que si este marcador se
-- insertara antes, se saltarían el movimiento y la reposición. Una reentrega del evento
-- (mismo id → bloqueada por `_event_delivery`; id distinto → bloqueada por este marcador)
-- no vuelve a sumar stock. Runtime inyecta :hub_id, :now; :sale_id viene del evento.
INSERT INTO inventory_void_restock (hub_id, sale_id, created_at)
VALUES (:hub_id, :sale_id, :now)
ON CONFLICT (hub_id, sale_id) DO NOTHING;
