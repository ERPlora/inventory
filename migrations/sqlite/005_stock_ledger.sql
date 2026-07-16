-- inventory#7 (+ decimales de #10): libro de movimientos LOCATION-READY (ADR-0135).
--
-- Diseño (criterios del issue):
--   * `inventory_location` — ubicación LÓGICA. El MVP es de ubicación única: cada hub
--     tiene una predeterminada con id determinista `<hub_id>:default` (estable y
--     migrable); los comandos la resuelven cuando el caller no envía `location_id`.
--     Warehouse añadirá ubicaciones físicas SOBRE este contrato (nunca otro ledger).
--   * `inventory_stock_movement` — libro INMUTABLE (append-only): delta firmado (`qty`),
--     saldo resultante (`stock_after`), tipo, motivo, referencia al documento origen,
--     coste y auditoría. Las columnas de soft-delete existen por el contrato de fila
--     §2.5 pero un movimiento NUNCA se edita ni borra.
--   * `inventory_product.stock` queda como PROYECCIÓN del saldo de la ubicación
--     predeterminada (decisión de #7): los consumidores actuales siguen leyéndolo;
--     saldo y movimiento se escriben en la MISMA transacción del command.
--   * Cantidades NUMERIC (#10): SQLite guarda fracciones como REAL (redondeo controlado
--     a 3 decimales en las fronteras); en Postgres son REAL exactos.
CREATE TABLE IF NOT EXISTS inventory_location (
    id         TEXT PRIMARY KEY,
    hub_id     TEXT NOT NULL,
    name       TEXT NOT NULL DEFAULT 'General',
    is_default INTEGER NOT NULL DEFAULT 0,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_by TEXT,
    updated_by TEXT,
    created_at TEXT,
    updated_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_location_default
    ON inventory_location (hub_id) WHERE is_default = 1;

CREATE TABLE IF NOT EXISTS inventory_stock_movement (
    id            TEXT PRIMARY KEY,
    hub_id        TEXT NOT NULL,
    location_id   TEXT NOT NULL,
    product_id    TEXT NOT NULL,
    movement_type TEXT NOT NULL,   -- initial|reception|sale|void|count|decrease
    qty           REAL NOT NULL,          -- delta firmado (+entra / −sale)
    stock_after   REAL NOT NULL,          -- saldo resultante en la ubicación
    reason        TEXT,                       -- obligatorio en correcciones manuales (schema)
    reference     TEXT,                       -- documento origen (sale_id, albarán…)
    unit_cost     INTEGER,                    -- céntimos (recepciones)
    is_deleted    INTEGER NOT NULL DEFAULT 0, -- contrato §2.5; el ledger es append-only
    deleted_at    TEXT,
    created_by    TEXT,
    updated_by    TEXT,
    created_at    TEXT,
    updated_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_ism_hub_product ON inventory_stock_movement (hub_id, product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ism_hub_type    ON inventory_stock_movement (hub_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_ism_hub_ref     ON inventory_stock_movement (hub_id, reference);

-- Migración del stock EXISTENTE sin pérdida: ubicación predeterminada para cada hub con
-- productos + un movimiento `initial` por producto con existencias, para que el historial
-- reconstruya el saldo desde el día cero. Ids deterministas → re-ejecución inocua.
INSERT INTO inventory_location (id, hub_id, name, is_default, is_deleted, created_at)
SELECT hub_id || ':default', hub_id, 'General', 1, 0, MIN(created_at)
FROM inventory_product WHERE is_deleted = 0
GROUP BY hub_id
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_stock_movement
    (id, hub_id, location_id, product_id, movement_type, qty, stock_after, is_deleted, created_by, created_at)
SELECT id || ':initial', hub_id, hub_id || ':default', id, 'initial', stock, stock, 0, updated_by, updated_at
FROM inventory_product
WHERE is_deleted = 0 AND product_type != 'service' AND stock != 0
ON CONFLICT (id) DO NOTHING;
