#!/usr/bin/env python3
"""A quantity that never crossed the 10^6 frontier is REJECTED (inventory#42) — real Postgres 18.

The bug this locks down. The published `restaurante`/`pizzeria` bundles seeded 280/50 products
with `stock = 100` and `low_stock_threshold = 10` written RAW, against the global 10^6 fixed-point
scale of ADR-0147 (`006_quantity_fixed_point.sql`, `007_quantity_threshold.sql`). The hub took them
without a word and the catalog opened showing `0.0001` units for every article, `0,00 EUR` of stock
value and not one low-stock warning: the first customer's inventory lied from minute one. The
bundle was re-scaled by hand on 2026-08-24 (v1.2.0), but NOTHING stopped the next export from doing
it again — `import_sql` validates the SHAPE of a blueprint statement, never the MEANING of the
values, and `onGrid` (ui/lib/quantity.ts) lives in the browser, which a blueprint import, the API,
a flow and the assistant all walk straight past.

The invariant, and why 1000. ADR-0147 puts every quantity on the grid its unit declares
(`inventory_unit.increment_value`). The finest grid in the canonical registry (seed/install.postgres.sql)
is 1/1000 of the base unit -- the gram inside `kg`, the millilitre inside `l`, the kilo inside `t`;
every other unit is coarser (`ud`/`g`/`ml`/`min` = 1000000, `h` = 250000). So EVERY legal quantity,
in every unit, is a multiple of `1000`. A value that is not is not a quantity at all: it is a raw
count that never crossed the frontier. That is the whole class of bug, and a CHECK constraint
expresses it without a subquery -- which matters, because a trigger cannot be used here: the hub's
migration guard refuses a procedural body in a module migration (hub#1149).

What is asserted:
  * the exact statement shape a blueprint import runs (`INSERT ... SELECT <literals> WHERE NOT
    EXISTS`, `export::rows_to_sql`) is REJECTED when it carries a raw-scale quantity;
  * every column that holds a 10^6 quantity is covered: product stock and threshold, variant
    stock, and the ledger's `qty`/`stock_after`;
  * legal quantities still pass -- whole units, half a kilo, zero, and a negative balance
    (overselling, inventory#6);
  * a hub that ALREADY swallowed a raw-scale bundle is REPAIRED by the migration (100 -> 100 units)
    and its products stay EDITABLE -- the regression that a bare constraint would have introduced,
    because Postgres re-checks the whole row on UPDATE even for a `NOT VALID` constraint;
  * the module's own commands keep working through the constraint.

Usage: tests/quantity_scale.postgres.test.py
  Uses the `erplora-test-pg-5433` container by default (override: INVENTORY_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail.
"""

import json
import os
import pathlib
import re
import subprocess
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
CONTAINER = os.environ.get(
    "INVENTORY_TEST_PG_CONTAINER",
    os.environ.get("ERPLORA_TEST_PG_CONTAINER", "erplora-test-pg-5433"),
)
DB = f"inventory_quantity_scale_test_{os.getpid()}"
HUB = "hub-test"
USER = "user-test"
NOW = "2026-09-09T09:00:00+00:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

QUANTITY_SCALE = 1_000_000
# The finest `increment_value` any unit in the canonical registry declares (gram, millilitre, kilo).
FINEST_GRID = 1_000

failures: list[str] = []


# ── Postgres plumbing ────────────────────────────────────────────────────────────────────


def psql(args: list[str], db: str | None = None, stdin: str | None = None) -> str:
    cmd = [
        "docker",
        "exec",
        "-i",
        CONTAINER,
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
    ]
    if db:
        cmd += ["-d", db]
    cmd += args
    res = subprocess.run(cmd, input=stdin, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or res.stdout.strip())
    return res.stdout


PARAM = re.compile(r":([a-z_][a-z0-9_]*)", re.IGNORECASE)


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def bind(sql: str, params: dict) -> str:
    return PARAM.sub(lambda m: literal(params.get(m.group(1))), sql)


_seq = 0


def system_params(**extra) -> dict:
    global _seq
    _seq += 1
    return {
        "hub_id": HUB,
        "current_user_id": USER,
        "now": NOW,
        "new_id": f"new-{_seq}",
        **extra,
    }


def run_command(command: str, **params) -> None:
    for rel in MANIFEST["commands"][command]["sql"]:
        psql(
            [],
            db=DB,
            stdin=bind((MODULE_DIR / rel).read_text(), system_params(**params)),
        )


def run_query(name: str, **params) -> list[dict]:
    qdef = MANIFEST["queries"][name]
    sql = (MODULE_DIR / qdef["sql"]).read_text().strip().rstrip(";")
    out = psql(
        [
            "-tAc",
            f"SELECT row_to_json(r) FROM ({bind(sql, {'hub_id': HUB, **params})}) r",
        ],
        db=DB,
    )
    return [json.loads(line) for line in out.splitlines() if line.strip()]


def scalar(sql: str):
    return psql(["-tAc", sql], db=DB).strip()


def rejected(sql: str) -> bool:
    """Did Postgres refuse this write? Anchored on the SQLSTATE of a check violation (23514),
    never on the message text (ADR-0055): the prose is not the contract."""
    cmd = [
        "docker",
        "exec",
        "-i",
        CONTAINER,
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
        "-d",
        DB,
        "-c",
        sql,
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        return False
    if "23514" in res.stderr or "check constraint" in res.stderr:
        return True
    raise RuntimeError(f"refused for the WRONG reason: {res.stderr.strip()}")


# ── Fixtures ─────────────────────────────────────────────────────────────────────────────


def blueprint_insert(pid: str, stock: int, threshold: int) -> str:
    """The statement shape a `.blueprint.zip` carries in `data/inventory.sql`.

    Byte-for-byte the grammar `crates/runtime/src/import_sql.rs` accepts and
    `crates/runtime/src/export.rs::rows_to_sql` emits: INSERT ... SELECT <literals> guarded by a
    WHERE NOT EXISTS on its own table. Nothing here is invented for the test."""
    return (
        "INSERT INTO inventory_product (id, hub_id, name, sku, description, product_type, "
        "price, cost, stock, low_stock_threshold, tax_category_key, is_active, is_deleted, "
        f"created_at, updated_at) SELECT '{pid}', '{HUB}', 'Agua mineral 50cl', '{pid}-sku', "
        f"'', 'physical', 150, 0, {stock}, {threshold}, 'standard', 1, 0, '{NOW}', '{NOW}' "
        f"WHERE NOT EXISTS (SELECT 1 FROM inventory_product WHERE id = '{pid}')"
    )


def add_product(pid: str, **overrides) -> None:
    columns = {
        "id": pid,
        "hub_id": HUB,
        "name": pid,
        "sku": pid,
        "price": 500,
        "stock": 10 * QUANTITY_SCALE,
        "low_stock_threshold": 2 * QUANTITY_SCALE,
        "is_active": 1,
        "is_deleted": 0,
        "tax_category_key": "standard",
        "created_at": NOW,
        **overrides,
    }
    psql(
        [
            "-c",
            f"INSERT INTO inventory_product ({', '.join(columns)}) "
            f"VALUES ({', '.join(literal(v) for v in columns.values())})",
        ],
        db=DB,
    )


def stock_of(pid: str) -> int:
    return int(scalar(f"SELECT stock FROM inventory_product WHERE id = '{pid}'"))


def threshold_of(pid: str) -> int:
    return int(
        scalar(f"SELECT low_stock_threshold FROM inventory_product WHERE id = '{pid}'")
    )


def check(label: str, expected, actual) -> None:
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


# ── The run ──────────────────────────────────────────────────────────────────────────────


def apply_module(upto: str | None = None) -> None:
    """Migrations in order (optionally stopping BEFORE `upto`), then the canonical unit seed."""
    for rel in MANIFEST["migrations"]["postgres"]:
        if upto and pathlib.Path(rel).name == upto:
            break
        psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
    if upto:
        return
    for rel in MANIFEST["seed"]["postgres"]:
        psql(
            [],
            db=DB,
            stdin=bind(
                (MODULE_DIR / rel).read_text(),
                {"hub_id": HUB, "current_user_id": USER, "now": NOW},
            ),
        )
    psql(
        [],
        db=DB,
        stdin="""
        CREATE TABLE IF NOT EXISTS sales_sale_item (
            id TEXT PRIMARY KEY, hub_id TEXT NOT NULL, sale_id TEXT NOT NULL,
            product_id TEXT, quantity BIGINT NOT NULL, is_service INTEGER NOT NULL DEFAULT 0
        );
    """,
    )


def guard_migration() -> str:
    """The migration this test is about, found by NAME: «the last one the manifest declares» stopped
    being true the day a later migration landed (inventory#98), and the repair then ran against a
    table that already carried the grid guard."""
    (name,) = [
        pathlib.Path(rel).name
        for rel in MANIFEST["migrations"]["postgres"]
        if pathlib.Path(rel).name.endswith("_quantity_grid_guard.sql")
    ]
    return name


def run() -> None:
    global DB
    apply_module()

    print("\n# 1. The canonical unit registry really is coarser than the grid we check")
    finest = int(
        scalar(
            f"SELECT MIN(increment_value) FROM inventory_unit WHERE hub_id = '{HUB}'"
        )
    )
    check("the finest increment any unit declares", FINEST_GRID, finest)
    off_grid = int(
        scalar(
            f"SELECT COUNT(*) FROM inventory_unit WHERE hub_id = '{HUB}' "
            f"AND increment_value % {FINEST_GRID} <> 0"
        )
    )
    check("no unit declares a grid that is not a multiple of it", 0, off_grid)

    print("\n# 2. inventory#42: the blueprint import cannot seed a raw-scale quantity")
    check(
        "stock=100 (the 280 products of `restaurante`) is refused",
        True,
        rejected(blueprint_insert("p-raw", 100, 10 * QUANTITY_SCALE)),
    )
    check(
        "stock=20 (`peluqueria`/`barberia`) is refused",
        True,
        rejected(blueprint_insert("p-raw2", 20, 5 * QUANTITY_SCALE)),
    )
    check(
        "low_stock_threshold=10 is refused too — same row, same bug",
        True,
        rejected(blueprint_insert("p-raw3", 100 * QUANTITY_SCALE, 10)),
    )
    check("nothing landed", 0, int(scalar("SELECT COUNT(*) FROM inventory_product")))

    print("\n# 3. The same bundle at the RIGHT scale still installs")
    check(
        "100 units with a threshold of 10 is accepted",
        False,
        rejected(blueprint_insert("p-ok", 100 * QUANTITY_SCALE, 10 * QUANTITY_SCALE)),
    )
    check("it reads back as 100 units", 100 * QUANTITY_SCALE, stock_of("p-ok"))

    print(
        "\n# 4. Every legal quantity still passes — the guard is the grid, not 'whole units'"
    )
    check(
        "half a kilo (500000) is a legal quantity",
        False,
        rejected("UPDATE inventory_product SET stock = 500000 WHERE id = 'p-ok'"),
    )
    check(
        "a single gram (1000) is the finest legal quantity",
        False,
        rejected("UPDATE inventory_product SET stock = 1000 WHERE id = 'p-ok'"),
    )
    check(
        "zero",
        False,
        rejected("UPDATE inventory_product SET stock = 0 WHERE id = 'p-ok'"),
    )
    check(
        "a negative balance (overselling, inventory#6)",
        False,
        rejected("UPDATE inventory_product SET stock = -2000000 WHERE id = 'p-ok'"),
    )
    check(
        "a tenth of a gram (100) is NOT — no unit can express it",
        True,
        rejected("UPDATE inventory_product SET stock = 100 WHERE id = 'p-ok'"),
    )

    print(
        "\n# 5. The variant and the ledger carry the same scale, so they carry the same guard"
    )
    psql(
        [
            "-c",
            f"INSERT INTO inventory_product_variant (id, hub_id, product_id, name, sku, "
            f"price, stock, is_deleted, created_at) VALUES ('v-ok', '{HUB}', 'p-ok', 'L', "
            f"'v-ok', 500, {2 * QUANTITY_SCALE}, 0, '{NOW}')",
        ],
        db=DB,
    )
    check(
        "a raw-scale variant stock is refused",
        True,
        rejected("UPDATE inventory_product_variant SET stock = 20 WHERE id = 'v-ok'"),
    )
    run_command("inventory._ensure_location")
    psql(
        [
            "-c",
            f"INSERT INTO inventory_stock_movement (id, hub_id, location_id, product_id, "
            f"movement_type, qty, stock_after, is_deleted, created_at) VALUES ('m-ok', "
            f"'{HUB}', '{HUB}:default', 'p-ok', 'initial', {QUANTITY_SCALE}, "
            f"{QUANTITY_SCALE}, 0, '{NOW}')",
        ],
        db=DB,
    )
    check(
        "a raw-scale ledger qty is refused",
        True,
        rejected("UPDATE inventory_stock_movement SET qty = 100 WHERE id = 'm-ok'"),
    )
    check(
        "a raw-scale ledger balance is refused",
        True,
        rejected(
            "UPDATE inventory_stock_movement SET stock_after = 100 WHERE id = 'm-ok'"
        ),
    )

    print("\n# 6. A hub that ALREADY swallowed the bad bundle is repaired, not bricked")
    psql(["-c", f'DROP DATABASE IF EXISTS "{DB}_legacy" WITH (FORCE)'])
    psql(["-c", f'CREATE DATABASE "{DB}_legacy"'])
    healthy, DB = DB, f"{DB}_legacy"
    try:
        apply_module(upto=guard_migration())  # the hub as it was BEFORE this fix
        psql(["-c", blueprint_insert("p-legacy", 100, 10)], db=DB)
        check("the old hub really did swallow it", 100, stock_of("p-legacy"))
        psql(
            [],
            db=DB,
            stdin=(
                MODULE_DIR / "migrations" / "postgres" / guard_migration()
            ).read_text(),
        )
        check(
            "the migration re-scales the stock to what it meant",
            100 * QUANTITY_SCALE,
            stock_of("p-legacy"),
        )
        check(
            "and the threshold with it", 10 * QUANTITY_SCALE, threshold_of("p-legacy")
        )
        check(
            "the repaired product is still EDITABLE (Postgres re-checks the row on UPDATE)",
            False,
            rejected(
                "UPDATE inventory_product SET name = 'Agua' WHERE id = 'p-legacy'"
            ),
        )
    finally:
        psql(["-c", f'DROP DATABASE IF EXISTS "{DB}" WITH (FORCE)'])
        DB = healthy

    print(
        "\n# 6b. And a row the repair deliberately does NOT touch cannot block the update"
    )
    # Off the grid but a whole unit and a half: outside the unambiguous raw-scale band, so §1 leaves
    # it exactly as it is. `NOT VALID` is what keeps installing this file from failing on a customer
    # who is selling — without it the ALTER would validate the table and the module update would die
    # on that one row.
    psql(["-c", f'DROP DATABASE IF EXISTS "{DB}_odd" WITH (FORCE)'])
    psql(["-c", f'CREATE DATABASE "{DB}_odd"'])
    healthy, DB = DB, f"{DB}_odd"
    try:
        apply_module(upto=guard_migration())
        psql(["-c", blueprint_insert("p-odd", 1_500_500, 10 * QUANTITY_SCALE)], db=DB)
        applied = True
        try:
            psql(
                [],
                db=DB,
                stdin=(
                    MODULE_DIR / "migrations" / "postgres" / guard_migration()
                ).read_text(),
            )
        except RuntimeError as exc:
            applied = False
            print(f"       migration refused the hub: {str(exc).splitlines()[0]}")
        check(
            "the migration still installs on a hub carrying an off-grid row",
            True,
            applied,
        )
        if applied:
            check(
                "and it leaves that row alone instead of inventing a number",
                1_500_500,
                stock_of("p-odd"),
            )
    finally:
        psql(["-c", f'DROP DATABASE IF EXISTS "{DB}" WITH (FORCE)'])
        DB = healthy

    print("\n# 7. The module's own commands still work through the guard")
    run_command("inventory._ensure_location")
    psql(
        ["-c", "UPDATE inventory_product SET stock = 10000000 WHERE id = 'p-ok'"], db=DB
    )
    run_command(
        "inventory._decrease_stock",
        product_id="p-ok",
        qty=2 * QUANTITY_SCALE,
        sale_id="s-1",
    )
    check("a sale still decreases the balance", 8 * QUANTITY_SCALE, stock_of("p-ok"))
    run_command(
        "inventory._adjust_stock",
        product_id="p-ok",
        stock=3 * QUANTITY_SCALE,
        reason="count",
    )
    check(
        "a stock count still sets the absolute value",
        3 * QUANTITY_SCALE,
        stock_of("p-ok"),
    )
    stats = run_query("inventory.products.stats")[0]
    check("the dashboard counts it as in stock", 1, stats["products_in_stock"])


def main() -> int:
    try:
        psql(["-c", f'DROP DATABASE IF EXISTS "{DB}"'])
        psql(["-c", f'CREATE DATABASE "{DB}"'])
    except RuntimeError as exc:
        # 🔴 `SKIPPED:` — the colon at column 0 is the contract, not decoration. The toolkit reads
        # `/^SKIPPED:/m` (module-toolkit#57) to tell "the whole battery skipped" from a green run;
        # written `SKIPPED — …` this returns 0 and `erplora test` prints a ✓ for a battery that
        # verified NOTHING, which is exactly the green-that-proves-nothing of module-toolkit#50 —
        # and here it would be the ✓ standing in for the only proof this guard has.
        print(f"SKIPPED: no Postgres at `{CONTAINER}`: {str(exc).splitlines()[0]}")
        print(
            "  (docker start erplora-test-pg-5433, or set INVENTORY_TEST_PG_CONTAINER)"
        )
        return 0

    try:
        run()
    except RuntimeError as exc:
        failures.append(f"SQL error: {str(exc).splitlines()[0]}")
        print(f"  FAIL: SQL error: {exc}")
    finally:
        psql(["-c", f'DROP DATABASE IF EXISTS "{DB}" WITH (FORCE)'])

    print()
    if failures:
        print(
            f"FAILED — {len(failures)} broken promise(s) about the 10^6 quantity frontier:"
        )
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "PASS — a raw-scale quantity cannot enter the catalog, whatever door it comes through"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
