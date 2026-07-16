-- Marcador «esta venta NO generó movimientos de stock» (inventory#6): lo emite el
-- listener `decrease_on_sale` cuando `track_stock = 0`, REUTILIZANDO la tabla de
-- idempotencia del void (`inventory_void_restock`, ADR-0075). Al llegar un
-- `sale.voided`, `_restock_on_void` ve el marcador y NO restituye: una venta se
-- revierte solo si la original descontó stock. Idempotente (ON CONFLICT DO NOTHING);
-- cero migraciones: misma tabla y misma semántica («este sale_id ya está saldado»).
-- Runtime inyecta :hub_id, :now; :sale_id viene del payload del evento.
INSERT INTO inventory_void_restock (hub_id, sale_id, created_at)
VALUES (:hub_id, :sale_id, :now)
ON CONFLICT (hub_id, sale_id) DO NOTHING;
