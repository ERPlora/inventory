-- ADR-0147 — la cantidad es un valor decimal EXACTO en una unidad de medida, persistido como
-- punto fijo entero con escala GLOBAL de 10⁶.
--
-- De dónde viene: `as_i64(0.5)` = 0 y `decrease_on_sale` hacía `qty <= 0 → continue`, o sea que
-- vender al peso **no descontaba stock y nadie se enteraba**. El fix parcial de #10 (`as_qty`,
-- HALF_UP a 3 decimales sobre f64) tapó el truncado pero dejó la coma flotante en el contrato — y
-- con ella `2.675 == 2.6749999999999998` y `8 % 1.6 = 1.5999999999999996`.
--
-- El entero es REPRESENTACIÓN, no significado: una cantidad *es* 0,5 kg; `500000` es cómo se
-- guarda. La escala es global (no por unidad) para que un evento entre módulos lleve `500000` y el
-- receptor no necesite saber nada más — con escala por unidad, el factor tendría que viajar hasta
-- donde se multiplica el dinero.
--
-- EL DINERO NO SE TOCA: `price` y `cost` siguen siendo enteros de céntimos (ADR-0007/0123). La
-- precisión sub-céntimo se consigue con la CANTIDAD DE PRECIO (§2.3, modelo KPEIN de SAP), no
-- metiendo decimales en el importe. Por eso esta migración no roza la frontera fiscal.

-- ── Registro de unidades ────────────────────────────────────────────────────────────────
-- El factor va como FRACCIÓN EXACTA hacia la referencia de su categoría: 1 min = 1/60 h no tiene
-- decimal finito, y aproximarlo mete error en cada conversión. SAP guarda así sus conversiones
-- (MARM-UMREZ/UMREN, dos enteros) por este mismo motivo.
--
-- El INCREMENTO va aparte de la escala a propósito. Odoo tenía escalón por unidad (`rounding`), en
-- la 19 lo centralizó en una precisión global y con ello PERDIÓ el escalón arbitrario (0,25 h,
-- «se vende de 6 en 6»). Aquí escala e incremento son cosas distintas y conviven.
CREATE TABLE IF NOT EXISTS inventory_unit (
    id             TEXT PRIMARY KEY,
    hub_id         TEXT NOT NULL,
    code           TEXT NOT NULL,                  -- ud|kg|g|t|l|ml|min|h
    name           TEXT NOT NULL,                  -- inglés canónico (ADR-0055)
    name_es        TEXT NOT NULL DEFAULT '',
    category       TEXT NOT NULL,                  -- count|mass|volume|time
    factor_num     INTEGER NOT NULL DEFAULT 1,     -- fracción EXACTA hacia la referencia
    factor_den     INTEGER NOT NULL DEFAULT 1,
    increment_value INTEGER NOT NULL DEFAULT 1000000,  -- escalón permitido, escala 10⁶
    is_reference   INTEGER NOT NULL DEFAULT 0,     -- la referencia de su categoría
    sort_order     INTEGER NOT NULL DEFAULT 0,
    is_deleted     INTEGER NOT NULL DEFAULT 0,
    deleted_at     TEXT,
    created_by     TEXT,
    updated_by     TEXT,
    created_at     TEXT,
    updated_at     TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_unit_hub_code ON inventory_unit (hub_id, code);
CREATE INDEX IF NOT EXISTS ix_inventory_unit_hub_cat ON inventory_unit (hub_id, category);

-- ── El producto declara su unidad base y su cantidad de precio ──────────────────────────
-- `ud` y «precio por 1 unidad» por defecto: el caso mayoritario no debe obligar a configurar nada
-- — un bar vende cañas, no kilos de caña — y el comportamiento actual no cambia.
ALTER TABLE inventory_product ADD COLUMN unit_code            TEXT    NOT NULL DEFAULT 'ud';
ALTER TABLE inventory_product ADD COLUMN price_quantity_value INTEGER NOT NULL DEFAULT 1000000;
ALTER TABLE inventory_product ADD COLUMN pricing_unit_code    TEXT    NOT NULL DEFAULT 'ud';

-- ── Cantidades a escala 10⁶ ─────────────────────────────────────────────────────────────
-- `stock` tiene afinidad INTEGER en SQLite, así que basta reescalar el dato existente. Todo lo que
-- hay son unidades sueltas: un stock de 3 pasa a 3000000 y sigue significando 3.
UPDATE inventory_product         SET stock = CAST(ROUND(stock) AS INTEGER) * 1000000;
UPDATE inventory_product_variant SET stock = CAST(ROUND(stock) AS INTEGER) * 1000000;

-- El ledger (005) declaró `qty`/`stock_after` como REAL, y en SQLite la afinidad REAL **fuerza a
-- coma flotante** cualquier entero que se le meta: un UPDATE saldría como `500000.0` y quien pida
-- un entero leería NULL. Como SQLite no tiene `ALTER COLUMN ... TYPE`, la única forma de cambiar la
-- afinidad es RECONSTRUIR la tabla. Se copia íntegra: el ledger es append-only y es la fuente de
-- verdad del saldo.
ALTER TABLE inventory_stock_movement RENAME TO inventory_stock_movement_old;

CREATE TABLE inventory_stock_movement (
    id            TEXT PRIMARY KEY,
    hub_id        TEXT NOT NULL,
    location_id   TEXT NOT NULL,
    product_id    TEXT NOT NULL,
    movement_type TEXT NOT NULL,   -- initial|reception|sale|void|count|decrease
    qty           INTEGER NOT NULL,        -- delta firmado, escala 10⁶ (+entra / −sale)
    stock_after   INTEGER NOT NULL,        -- saldo resultante, misma escala
    reason        TEXT,
    reference     TEXT,
    unit_cost     INTEGER,                    -- céntimos (recepciones) — dinero, NO se reescala
    is_deleted    INTEGER NOT NULL DEFAULT 0,
    deleted_at    TEXT,
    created_by    TEXT,
    updated_by    TEXT,
    created_at    TEXT,
    updated_at    TEXT
);

INSERT INTO inventory_stock_movement
    (id, hub_id, location_id, product_id, movement_type, qty, stock_after, reason, reference,
     unit_cost, is_deleted, deleted_at, created_by, updated_by, created_at, updated_at)
SELECT id, hub_id, location_id, product_id, movement_type,
       CAST(ROUND(qty) AS INTEGER) * 1000000,
       CAST(ROUND(stock_after) AS INTEGER) * 1000000,
       reason, reference, unit_cost, is_deleted, deleted_at, created_by, updated_by,
       created_at, updated_at
FROM inventory_stock_movement_old;

DROP TABLE inventory_stock_movement_old;

CREATE INDEX IF NOT EXISTS idx_ism_hub_product ON inventory_stock_movement (hub_id, product_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ism_hub_type    ON inventory_stock_movement (hub_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_ism_hub_ref     ON inventory_stock_movement (hub_id, reference);
