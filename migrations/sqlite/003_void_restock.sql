-- Inventory · 003 (SQLite) — ADR-0073: restitución de stock al ANULAR una venta.
-- Marcador de idempotencia propio del módulo (defensa en profundidad sobre el
-- `_event_delivery` del runtime): garantiza que el stock de una venta anulada se
-- restituye EXACTAMENTE UNA VEZ aunque el evento `sale.voided` se reentregue con un
-- id distinto. PK = sale_id por hub. Migración ADITIVA (no se edita 001/002).
CREATE TABLE IF NOT EXISTS inventory_void_restock (
    hub_id     TEXT NOT NULL,
    sale_id    TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (hub_id, sale_id)
);
