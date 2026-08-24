#!/usr/bin/env python3
"""The stock is moved by the COMPONENTS, never by the combo (inventory#69, ADR-0381).

Runs against a REAL Postgres 18 in Docker — the only dialect modules ship since ADR-0154.

A combo (menú del día, pack) is a vendible article with a closed price and **no stock of its own**:
selling one decreases each chosen component. Unanimous in the market — Odoo (phantom-BoM *kit*),
Shopify Bundles, WooCommerce Product Bundles, Square, Holded, NetSuite *kit* — and it is the
frontier that separates `combos` from `modifiers`, whose rule 1 says a modifier has no stock.

`inventory` never learns what a combo is: `combos` is not in `depends_on`, its reference to the
article is opaque by design, and nothing here reads `combos.*`. This file fixes the SQL half of the
rule; the routing half (which line hands its stock to which components) lives in the WASM handler.

Contract fixed here:

  * A decrease aimed at the combo itself moves nothing and writes NO ledger row — the combo is not
    an article, so the movement would be MUTE, which is the worst outcome available.
  * Each component moves through the door that already exists: `_decrease_stock`, one atomic
    ledger movement + stock UPDATE per component, referencing the sale.
  * A component that does not track stock (ADR-0368 tri-state) moves nothing and breaks nothing.
  * 🔴 The void REVERSES THE LEDGER, not the sale lines: it gives back exactly what left. Reading
    `sales_sale_item` could not see a combo's components at all (they live in the line's snapshot,
    not in rows), and it also restocked decreases that had been REJECTED for insufficient stock.
  * Each restock sheet stays ONE statement (the multi-statement trap of inventory#28): Postgres
    refuses several commands in a prepared statement, and that bug deferred the whole delivery of
    `sale.voided` in Hub Cloud.

Usage: tests/combo_components_stock.postgres.test.py
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
CONTAINER = os.environ.get("INVENTORY_TEST_PG_CONTAINER", "erplora-test-pg-5433")
DB = f"inventory_combo_stock_test_{os.getpid()}"
HUB = "hub-test"
USER = "user-test"
NOW = "2026-08-24T09:00:00+00:00"
UNIT = 1_000_000  # 10⁶ fixed point (ADR-0147): one unit. Half a portion is 500000, never 0.5.

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

failures: list[str] = []


# ── Postgres plumbing ────────────────────────────────────────────────────────────────────


def psql(args: list[str], db: str | None = None, stdin: str | None = None) -> str:
    cmd = ["docker", "exec", "-i", CONTAINER, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres"]
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
    """Single pass over the `:name` placeholders. Params the caller does not supply bind as NULL,
    which is what the runtime's driver does (`DynNull`, crates/db/src/lib.rs)."""
    return PARAM.sub(lambda m: literal(params.get(m.group(1))), sql)


_seq = 0


def system_params(**extra) -> dict:
    """The non-spoofable params the runtime injects on every statement (row contract §2.5)."""
    global _seq
    _seq += 1
    return {"hub_id": HUB, "current_user_id": USER, "now": NOW, "new_id": f"new-{_seq}", **extra}


def run_sql_file(rel: str, params: dict) -> None:
    psql([], db=DB, stdin=bind((MODULE_DIR / rel).read_text(), params))


def run_command(command: str, **params) -> None:
    """Every sheet of the command's `sql[]`, in order, the way the dispatcher runs them."""
    for rel in MANIFEST["commands"][command]["sql"]:
        run_sql_file(rel, system_params(**params))


def scalar(sql: str) -> str:
    return psql(["-tAc", sql], db=DB).strip()


# ── Fixtures ─────────────────────────────────────────────────────────────────────────────


def add_product(pid: str, **overrides) -> None:
    columns = {
        "id": pid,
        "hub_id": HUB,
        "name": pid,
        "sku": pid,
        "price": 500,
        "stock": 10 * UNIT,
        "is_active": 1,
        "is_deleted": 0,
        "tax_category_key": "standard",
        "created_at": NOW,
        **overrides,
    }
    cols = ", ".join(columns)
    values = ", ".join(literal(v) for v in columns.values())
    psql(["-c", f"INSERT INTO inventory_product ({cols}) VALUES ({values})"], db=DB)


def set_hub(track: int = 1, allow_oversell: int = 0) -> None:
    psql(["-c", "DELETE FROM inventory_settings"], db=DB)
    psql(
        [
            "-c",
            "INSERT INTO inventory_settings (id, hub_id, track_stock, allow_sell_without_stock, created_at) "
            f"VALUES ('s1', '{HUB}', {track}, {allow_oversell}, '{NOW}')",
        ],
        db=DB,
    )


def stock_of(pid: str) -> int:
    return int(scalar(f"SELECT stock FROM inventory_product WHERE id = '{pid}'"))


def movements_of(pid: str, movement_type: str | None = None) -> int:
    where = f"product_id = '{pid}'"
    if movement_type:
        where += f" AND movement_type = '{movement_type}'"
    return int(scalar(f"SELECT COUNT(*) FROM inventory_stock_movement WHERE {where}"))


def clear() -> None:
    psql(
        [
            "-c",
            "DELETE FROM inventory_stock_movement; DELETE FROM inventory_void_restock; "
            "DELETE FROM inventory_product; DELETE FROM sales_sale_item",
        ],
        db=DB,
    )


def check(label: str, expected, actual) -> None:
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


# ── The run ──────────────────────────────────────────────────────────────────────────────


def apply_migrations() -> None:
    for rel in (MANIFEST.get("migrations") or {}).get("postgres", []):
        psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())
    # Stand-in for the `sales` table the void restock used to read. It stays here on purpose: the
    # restock must keep working while this table exists and holds NOTHING about the components.
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


def sell_menu(sale_id: str, components: list[tuple[str, int]], combo_id: str = "menu-del-dia") -> None:
    """What the handler emits for a composed line: ONE line in `sales_sale_item` naming the combo
    (its components live in the line's snapshot, not in rows) and one `_decrease_stock` per
    component. Nothing is ever aimed at the combo."""
    psql(
        [
            "-c",
            "INSERT INTO sales_sale_item (id, hub_id, sale_id, product_id, quantity, is_service) "
            f"VALUES ('{sale_id}-l1', '{HUB}', '{sale_id}', '{combo_id}', {UNIT}, 0)",
        ],
        db=DB,
    )
    run_command("inventory._ensure_location")
    for pid, qty in components:
        run_command("inventory._decrease_stock", product_id=pid, qty=qty, sale_id=sale_id)


def run() -> None:
    apply_migrations()

    print("\n# 1. Selling a menu decreases EACH component, one ledger row each")
    clear()
    set_hub(track=1)
    for pid in ("primero", "segundo", "postre"):
        add_product(pid, track_stock=1)
    sell_menu("s-menu", [("primero", UNIT), ("segundo", UNIT), ("postre", UNIT)])
    for pid in ("primero", "segundo", "postre"):
        check(f"{pid} decreased by one unit", 9 * UNIT, stock_of(pid))
        check(f"{pid} wrote its `sale` ledger row", 1, movements_of(pid, "sale"))
    check(
        "three ledger lines for the menu, one per component",
        "3",
        scalar("SELECT COUNT(*) FROM inventory_stock_movement WHERE reference = 's-menu'"),
    )

    print("\n# 2. The combo itself is not an article: a decrease aimed at it moves NOTHING")
    before = scalar("SELECT COUNT(*) FROM inventory_stock_movement")
    run_command("inventory._decrease_stock", product_id="menu-del-dia", qty=UNIT, sale_id="s-menu")
    check("no ledger row for the combo", before, scalar("SELECT COUNT(*) FROM inventory_stock_movement"))
    check(
        "the combo has no stock row at all",
        "0",
        scalar("SELECT COUNT(*) FROM inventory_product WHERE id = 'menu-del-dia'"),
    )

    print("\n# 3. Voiding the menu gives back EXACTLY what left — the components, not the combo")
    run_command("inventory._restock_on_void", sale_id="s-menu")
    for pid in ("primero", "segundo", "postre"):
        check(f"{pid} restored", 10 * UNIT, stock_of(pid))
        check(f"{pid} got its `void` movement", 1, movements_of(pid, "void"))
    check(
        "void marker written once",
        "1",
        scalar("SELECT COUNT(*) FROM inventory_void_restock WHERE sale_id = 's-menu'"),
    )
    print("  (re-delivery of the same event must not add stock twice)")
    run_command("inventory._restock_on_void", sale_id="s-menu")
    check("second delivery is inert", 10 * UNIT, stock_of("primero"))
    check("no second `void` movement", 1, movements_of("primero", "void"))

    print("\n# 4. A component that does not track moves nothing and breaks nothing")
    clear()
    set_hub(track=1)
    add_product("bebida", track_stock=1)
    add_product("servilleta", track_stock=0)
    sell_menu("s-mix", [("bebida", UNIT), ("servilleta", UNIT)])
    check("the tracking component decreased", 9 * UNIT, stock_of("bebida"))
    check("the untracked component untouched", 10 * UNIT, stock_of("servilleta"))
    check("the untracked component wrote no ledger row", 0, movements_of("servilleta"))
    run_command("inventory._restock_on_void", sale_id="s-mix")
    check("void restores only what left", 10 * UNIT, stock_of("bebida"))
    check("void does not invent stock for the untracked one", 10 * UNIT, stock_of("servilleta"))

    print("\n# 5. Fixed point 10⁶: half a portion is 500000, and it comes back as 500000")
    clear()
    set_hub(track=1)
    add_product("jamon", track_stock=1)
    sell_menu("s-half", [("jamon", UNIT // 2)])
    check("half a portion left", 9_500_000, stock_of("jamon"))
    run_command("inventory._restock_on_void", sale_id="s-half")
    check("half a portion came back — not 0,0001 units", 10 * UNIT, stock_of("jamon"))

    print("\n# 6. A REJECTED decrease is not restocked by the void (the ledger is the authority)")
    clear()
    set_hub(track=1, allow_oversell=0)
    add_product("escaso", track_stock=1, stock=UNIT)
    psql(
        [
            "-c",
            "INSERT INTO sales_sale_item (id, hub_id, sale_id, product_id, quantity, is_service) "
            f"VALUES ('l-x', '{HUB}', 's-short', 'escaso', {5 * UNIT}, 0)",
        ],
        db=DB,
    )
    run_command("inventory._ensure_location")
    run_command("inventory._decrease_stock", product_id="escaso", qty=5 * UNIT, sale_id="s-short")
    check("insufficient stock: the decrease did not apply", UNIT, stock_of("escaso"))
    check("and wrote no ledger row", 0, movements_of("escaso"))
    run_command("inventory._restock_on_void", sale_id="s-short")
    check("the void gives back NOTHING: nothing ever left", UNIT, stock_of("escaso"))
    check("and writes no `void` movement", 0, movements_of("escaso", "void"))

    print("\n# 7. Every restock sheet is ONE statement (the multi-statement trap of #28)")
    for i, rel in enumerate(MANIFEST["commands"]["inventory._restock_on_void"]["sql"]):
        sql = bind((MODULE_DIR / rel).read_text(), system_params(sale_id="s-prep")).strip().rstrip(";")
        try:
            psql(["-c", f"PREPARE prep_{i} AS {sql}"], db=DB)
            ok = True
        except RuntimeError as exc:
            ok = False
            print(f"    {exc}")
        check(f"{rel} prepares as a single statement", True, ok)


def main() -> int:
    psql(["-c", f'CREATE DATABASE "{DB}"'])
    try:
        run()
    finally:
        psql(["-c", f'DROP DATABASE IF EXISTS "{DB}"'])
    if failures:
        print(f"\n{len(failures)} FAILURE(S):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
