#!/usr/bin/env python3
"""`track_stock` is a PER-PRODUCT flag (inventory#48) — runs against a REAL Postgres 18 in Docker.

Decision of the market (sales#25 — Square, Odoo, Business Central, Shopify, WooCommerce, Toast,
Lightspeed, Fresha, Vagaro): the catalog is not coupled to stock control; tracking is an opt-in
per article. Until #48 `track_stock` lived only in `inventory_settings`, one switch for the whole
hub, so a restaurant with three retail products had to either track everything or nothing.

Contract fixed here (SQL is the authoritative guard, inside the transaction — the WASM handler
only mirrors it to make the outcome visible):

  * `inventory_product.track_stock` is TRI-STATE (ADR-0368): `1` tracks, `0` does not, `NULL`
    follows the hub setting. Existing rows stay NULL, so no live hub changes behaviour.
  * effective = COALESCE(product.track_stock, settings.track_stock, 1); services never track.
  * `_decrease_stock` (sale + direct decrease) is a NO-OP for an article whose effective flag is
    off: no stock change, no ledger row — even when the hub tracks.
  * the void restock restores ONLY the lines whose product tracks (the others never decreased).
  * `products.for_sale` projects the EFFECTIVE flag so the POS knows there is no availability to
    show; `products.get`/`products.list` project the raw value the form edits.
  * `products.create` accepts the flag (absent = NULL); `products.update` keeps it when absent.
  * low-stock and stats only count articles that track.

Usage: tests/track_stock.postgres.test.py
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
DB = f"inventory_track_stock_test_{os.getpid()}"
HUB = "hub-test"
USER = "user-test"
NOW = "2026-08-18T09:00:00+00:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

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
    """Single pass over the `:name` placeholders. Params the caller does not supply bind as NULL,
    which is what the runtime's driver does (`DynNull`, crates/db/src/lib.rs)."""
    return PARAM.sub(lambda m: literal(params.get(m.group(1))), sql)


_seq = 0


def system_params(**extra) -> dict:
    """The non-spoofable params the runtime injects on every statement (row contract §2.5)."""
    global _seq
    _seq += 1
    return {
        "hub_id": HUB,
        "current_user_id": USER,
        "now": NOW,
        "new_id": f"new-{_seq}",
        **extra,
    }


def run_sql_file(rel: str, params: dict) -> None:
    sql = (MODULE_DIR / rel).read_text()
    psql([], db=DB, stdin=bind(sql, params))


def run_command(command: str, **params) -> None:
    """Every sheet of the command's `sql[]`, in order, the way the dispatcher runs them."""
    cdef = MANIFEST["commands"][command]
    for rel in cdef["sql"]:
        run_sql_file(rel, system_params(**params))


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
    out = psql(["-tAc", sql], db=DB).strip()
    return out


# ── Fixtures ─────────────────────────────────────────────────────────────────────────────


def add_product(pid: str, **overrides) -> None:
    columns = {
        "id": pid,
        "hub_id": HUB,
        "name": pid,
        "sku": pid,
        "price": 500,
        "stock": 10_000_000,
        "is_active": 1,
        "is_deleted": 0,
        "tax_category_key": "standard",
        "created_at": NOW,
        **overrides,
    }
    cols = ", ".join(columns)
    values = ", ".join(literal(v) for v in columns.values())
    psql(["-c", f"INSERT INTO inventory_product ({cols}) VALUES ({values})"], db=DB)


def set_hub_tracking(track: int) -> None:
    psql(["-c", "DELETE FROM inventory_settings"], db=DB)
    psql(
        [
            "-c",
            f"INSERT INTO inventory_settings (id, hub_id, track_stock, created_at) VALUES ('s1', '{HUB}', {track}, '{NOW}')",
        ],
        db=DB,
    )


def stock_of(pid: str) -> int:
    return int(scalar(f"SELECT stock FROM inventory_product WHERE id = '{pid}'"))


def movements_of(pid: str) -> int:
    return int(
        scalar(
            f"SELECT COUNT(*) FROM inventory_stock_movement WHERE product_id = '{pid}'"
        )
    )


def track_stock_of(pid: str):
    v = scalar(
        f"SELECT COALESCE(track_stock::text, 'NULL') FROM inventory_product WHERE id = '{pid}'"
    )
    return None if v == "NULL" else int(v)


def clear() -> None:
    psql(
        [
            "-c",
            "DELETE FROM inventory_stock_movement; DELETE FROM inventory_void_restock; DELETE FROM inventory_product; DELETE FROM sales_sale_item",
        ],
        db=DB,
    )


# ── Assertions ───────────────────────────────────────────────────────────────────────────


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
    # The void restock reads the sale lines by subquery (SEAM on `sales`): a stand-in table with
    # the columns the sheets touch is enough here.
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


def add_sale_line(
    line_id: str, sale_id: str, pid: str, qty: int, is_service: int = 0
) -> None:
    psql(
        [
            "-c",
            f"INSERT INTO sales_sale_item (id, hub_id, sale_id, product_id, quantity, is_service) VALUES ('{line_id}', '{HUB}', '{sale_id}', '{pid}', {qty}, {is_service})",
        ],
        db=DB,
    )


def run() -> None:
    apply_migrations()

    print("\n# 1. The column exists, is nullable, and pre-existing rows inherit (NULL)")
    add_product("legacy")
    check(
        "a row created before #48 has track_stock NULL (follows the hub)",
        None,
        track_stock_of("legacy"),
    )
    nullable = scalar(
        "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'inventory_product' AND column_name = 'track_stock'"
    )
    check("inventory_product.track_stock is nullable (tri-state)", "YES", nullable)

    print(
        "\n# 2. Hub tracks; the article opted OUT → the sale decrease is a no-op for it"
    )
    clear()
    set_hub_tracking(1)
    add_product("p-on", track_stock=1)
    add_product("p-off", track_stock=0)
    add_product("p-null")
    for pid in ("p-on", "p-off", "p-null"):
        run_command("inventory._ensure_location")
        run_command(
            "inventory._decrease_stock", product_id=pid, qty=2_000_000, sale_id="s-1"
        )
    check("explicit 1 decreases", 8_000_000, stock_of("p-on"))
    check("explicit 1 writes its ledger row", 1, movements_of("p-on"))
    check(
        "explicit 0 does NOT decrease although the hub tracks",
        10_000_000,
        stock_of("p-off"),
    )
    check("explicit 0 writes NO ledger row", 0, movements_of("p-off"))
    check("NULL inherits hub=1 → decreases", 8_000_000, stock_of("p-null"))

    print("\n# 3. Hub does NOT track; the article opted IN → it decreases anyway")
    clear()
    set_hub_tracking(0)
    add_product("p-on", track_stock=1)
    add_product("p-null")
    for pid in ("p-on", "p-null"):
        run_command(
            "inventory._decrease_stock", product_id=pid, qty=2_000_000, sale_id="s-2"
        )
    check(
        "explicit 1 decreases although the hub does not track",
        8_000_000,
        stock_of("p-on"),
    )
    check("NULL inherits hub=0 → untouched", 10_000_000, stock_of("p-null"))
    check("NULL inherits hub=0 → no ledger row", 0, movements_of("p-null"))

    print("\n# 4. Void restock restores ONLY the lines whose product tracks")
    clear()
    set_hub_tracking(1)
    add_product("p-on", track_stock=1, stock=10_000_000)
    add_product("p-off", track_stock=0, stock=10_000_000)
    add_sale_line("l1", "s-3", "p-on", 2_000_000)
    add_sale_line("l2", "s-3", "p-off", 2_000_000)
    # The sale is ACTUALLY played, not just written down: since inventory#69 the void reverses
    # THIS module's ledger, not the sale lines, so what comes back is what really left. `p-off`
    # does not track, so its decrease is a no-op and leaves no movement — and gets nothing back.
    run_command("inventory._ensure_location")
    for pid in ("p-on", "p-off"):
        run_command(
            "inventory._decrease_stock", product_id=pid, qty=2_000_000, sale_id="s-3"
        )
    check("tracked line decreased at sale time", 8_000_000, stock_of("p-on"))
    run_command("inventory._restock_on_void", sale_id="s-3")
    check("tracked line restocked", 10_000_000, stock_of("p-on"))
    check("tracked line got its `void` movement", 2, movements_of("p-on"))  # sale + void
    check("untracked line NOT restocked (it never left)", 10_000_000, stock_of("p-off"))
    check("untracked line got NO movement", 0, movements_of("p-off"))
    check(
        "void marker written once",
        "1",
        scalar("SELECT COUNT(*) FROM inventory_void_restock WHERE sale_id = 's-3'"),
    )

    print(
        "\n# 5. products.for_sale projects the EFFECTIVE flag; get/list project the raw one"
    )
    clear()
    set_hub_tracking(1)
    add_product("p-on", track_stock=1)
    add_product("p-off", track_stock=0)
    add_product("p-null")
    add_product("p-svc", product_type="service")
    rows = {r["id"]: r for r in run_query("inventory.products.for_sale")}
    check("for_sale: explicit 1 → 1", 1, rows["p-on"].get("track_stock"))
    check("for_sale: explicit 0 → 0", 0, rows["p-off"].get("track_stock"))
    check("for_sale: NULL with hub=1 → 1", 1, rows["p-null"].get("track_stock"))
    check("for_sale: a service never tracks → 0", 0, rows["p-svc"].get("track_stock"))
    set_hub_tracking(0)
    rows = {r["id"]: r for r in run_query("inventory.products.for_sale")}
    check("for_sale: NULL with hub=0 → 0", 0, rows["p-null"].get("track_stock"))
    check("for_sale: explicit 1 with hub=0 → 1", 1, rows["p-on"].get("track_stock"))
    got = run_query("inventory.products.get", product_id="p-null")[0]
    check(
        "get: raw NULL survives (the form must know it inherits)",
        None,
        got.get("track_stock"),
    )
    check("get: the key IS projected", True, "track_stock" in got)
    listed = {r["id"]: r for r in run_query("inventory.products.list")}
    check("list: projects track_stock", True, "track_stock" in listed["p-on"])
    check("list: raw value", 0, listed["p-off"].get("track_stock"))

    print("\n# 6. create/update carry the flag; absent keeps it")
    clear()
    set_hub_tracking(1)
    run_command(
        "inventory.products.create",
        name="Created",
        sku="C-1",
        ean13=None,
        description="",
        product_type="physical",
        price=100,
        cost=0,
        stock=0,
        tax_category_key="standard",
        image="",
        track_stock=0,
    )
    cid = scalar("SELECT id FROM inventory_product WHERE sku = 'C-1'")
    check("create with track_stock=0 persists 0", 0, track_stock_of(cid))
    run_command(
        "inventory.products.create",
        name="Created2",
        sku="C-2",
        ean13=None,
        description="",
        product_type="physical",
        price=100,
        cost=0,
        stock=0,
        tax_category_key="standard",
        image="",
    )
    cid2 = scalar("SELECT id FROM inventory_product WHERE sku = 'C-2'")
    check("create without the flag persists NULL (inherit)", None, track_stock_of(cid2))
    base = dict(
        name="Created",
        price=100,
        cost=0,
        low_stock_threshold=1,
        ean13=None,
        description="",
        tax_category_key="standard",
        is_active=1,
    )
    run_command("inventory.products.update", product_id=cid, **base)
    check("update WITHOUT the flag keeps 0", 0, track_stock_of(cid))
    run_command("inventory.products.update", product_id=cid, track_stock=1, **base)
    check("update WITH the flag sets 1", 1, track_stock_of(cid))
    run_command(
        "inventory._insert_product",
        product_id="bulk-1",
        name="B",
        sku="B-1",
        ean13=None,
        description="",
        product_type="physical",
        price=1,
        cost=0,
        stock=0,
        low_stock_threshold=1,
        tax_category_key="standard",
        image="",
        track_stock=0,
    )
    check("_insert_product (bulk) persists the flag", 0, track_stock_of("bulk-1"))

    print("\n# 7. Low-stock and stats only count articles that track")
    clear()
    set_hub_tracking(1)
    add_product(
        "p-low-on", track_stock=1, stock=1_000_000, low_stock_threshold=5_000_000
    )
    add_product(
        "p-low-off", track_stock=0, stock=1_000_000, low_stock_threshold=5_000_000
    )
    low = [r["id"] for r in run_query("inventory.products.low_stock")]
    check("low_stock lists the tracked one", True, "p-low-on" in low)
    check("low_stock does NOT nag about the untracked one", False, "p-low-off" in low)
    stats = run_query("inventory.products.stats")[0]
    check(
        "stats.products_low_stock counts only tracked",
        1,
        int(stats["products_low_stock"]),
    )
    check(
        "stats.products_tracked counts only tracked", 1, int(stats["products_tracked"])
    )
    check(
        "stats.total_products still counts the whole catalog",
        2,
        int(stats["total_products"]),
    )

    print("\n# 8. inventory#47: `products.stock_levels` feeds the crossing handlers (effective flag + numbers)")
    clear()
    set_hub_tracking(1)
    add_product("p-on", track_stock=1, stock=6_000_000, low_stock_threshold=5_000_000)
    add_product("p-null", stock=1_000_000, low_stock_threshold=5_000_000)
    add_product("p-off", track_stock=0)
    add_product("p-svc", product_type="service")
    add_product("p-archived", is_active=0)
    lv = {r["id"]: r for r in run_query("inventory.products.stock_levels")}
    check("stock_levels: every active row, archived excluded", {"p-on", "p-null", "p-off", "p-svc"}, set(lv))
    for col in ("id", "sku", "name", "stock", "low_stock_threshold", "track_stock", "product_type"):
        check(f"stock_levels projects `{col}`", True, col in lv["p-on"])
    check("stock_levels: stock in 10^6 scale as stored", 6_000_000, int(lv["p-on"]["stock"]))
    check("stock_levels: threshold per product", 5_000_000, int(lv["p-on"]["low_stock_threshold"]))
    check("stock_levels: NULL inherits hub=1", 1, lv["p-null"]["track_stock"])
    check("stock_levels: explicit 0", 0, lv["p-off"]["track_stock"])
    check("stock_levels: service never tracks", 0, lv["p-svc"]["track_stock"])

    print("\n# 9. inventory#47: `stock.adjust` is a handler; its private sheets still count and move")
    adjust = MANIFEST["commands"]["inventory.stock.adjust"]
    check("stock.adjust runs through the WASM handler `adjust_stock`", "adjust_stock", (adjust.get("handler") or {}).get("function"))
    check("stock.adjust pre-loads the product row (previous balance + threshold)", True,
          any(isinstance(r, dict) and r.get("query") == "inventory.products.get" for r in adjust.get("reads", [])))
    check("`inventory.low_stock_crossed` is declared in events.emits", True,
          "inventory.low_stock_crossed" in MANIFEST["events"]["emits"])
    run_command("inventory._ensure_location")
    run_command("inventory._movement_on_adjust", product_id="p-on", stock=2_000_000, reason="count")
    run_command("inventory._adjust_stock", product_id="p-on", stock=2_000_000, reason="count")
    check("_adjust_stock sets the absolute value", 2_000_000, stock_of("p-on"))
    check("_movement_on_adjust wrote the `count` movement", "count",
          scalar("SELECT movement_type FROM inventory_stock_movement WHERE product_id = 'p-on'"))
    check("the movement carries the difference", "-4000000",
          scalar("SELECT qty FROM inventory_stock_movement WHERE product_id = 'p-on'"))


def main() -> int:
    try:
        psql(["-c", f'DROP DATABASE IF EXISTS "{DB}"'])
        psql(["-c", f'CREATE DATABASE "{DB}"'])
    except RuntimeError as exc:
        print(f"SKIPPED — no Postgres at `{CONTAINER}`: {str(exc).splitlines()[0]}")
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
            f"FAILED — {len(failures)} broken promise(s) about the per-product track_stock flag:"
        )
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "PASS — track_stock is decided per article, the hub setting is only its default"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
