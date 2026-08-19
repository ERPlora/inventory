#!/usr/bin/env python3
"""Deleting a category UNLINKS its products — it never deletes them (inventory#8), against a REAL
Postgres 18 in Docker.

Decision of the market (2026-08-19, skill `market-decision`; the table with the 9 references lives
in the PR and in `architecture/modules/inventory.md`): **unlink**. Shopify, WooCommerce, Square,
Lightspeed, Toast and Vagaro all let the category go and keep the articles; the only two that block
— Odoo and Business Central — do it because in their model an article has ONE required category and
cannot exist without it. Ours is an optional N:M, so the reason to block does not apply, and
blocking would make the operator unassign the articles one by one before deleting.

What was actually shipping until this test: `category_delete.sql` soft-deleted the category and
left every `inventory_product_categories` row pointing at it. Nothing "unlinked" — the link simply
stopped being visible because `categories.list` hides deleted categories. The rows stayed forever,
`inventory.product_categories` (the map the POS filters the catalogue with) kept serving them, and
re-creating a category with the same id would resurrect assignments nobody made.

Usage: tests/category_delete.postgres.test.py
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
DB = f"inventory_category_delete_test_{os.getpid()}"
HUB = "hub-test"
OTHER_HUB = "hub-neighbour"
USER = "user-test"
NOW = "2026-08-19T09:00:00+00:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

failures: list[str] = []


# ── Postgres plumbing (same shape as track_stock.postgres.test.py) ───────────────────────


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
    """Single pass over the `:name` placeholders; anything the caller omits binds as NULL, the way
    the runtime's driver does (`DynNull`, crates/db/src/lib.rs)."""
    return PARAM.sub(lambda m: literal(params.get(m.group(1))), sql)


def run_command(command: str, hub_id: str = HUB, **params) -> None:
    """Every sheet of the command's `sql[]`, in order, the way the dispatcher runs them — with the
    system params the runtime injects and the caller cannot forge (row contract §2.5)."""
    for rel in MANIFEST["commands"][command]["sql"]:
        sql = (MODULE_DIR / rel).read_text()
        psql(
            [],
            db=DB,
            stdin=bind(
                sql, {"hub_id": hub_id, "current_user_id": USER, "now": NOW, **params}
            ),
        )


def scalar(sql: str) -> str:
    return psql(["-tAc", sql], db=DB).strip()


# ── Fixtures ─────────────────────────────────────────────────────────────────────────────


def add_category(cid: str, hub_id: str = HUB) -> None:
    psql(
        [
            "-c",
            f"INSERT INTO inventory_category (id, hub_id, name, slug, is_active, is_deleted, created_at) "
            f"VALUES ('{cid}', '{hub_id}', '{cid}', '{cid}', 1, 0, '{NOW}')",
        ],
        db=DB,
    )


def add_product(pid: str, hub_id: str = HUB) -> None:
    psql(
        [
            "-c",
            f"INSERT INTO inventory_product (id, hub_id, name, sku, price, stock, is_active, is_deleted, created_at) "
            f"VALUES ('{pid}', '{hub_id}', '{pid}', '{pid}', 500, 0, 1, 0, '{NOW}')",
        ],
        db=DB,
    )


def link(pid: str, cid: str) -> None:
    """Through the module's own door (`products.add_category`), not a raw INSERT: a link written by
    hand would prove nothing about the link the product form actually creates."""
    run_command("inventory.products.add_category", product_id=pid, category_id=cid)


def links_of(cid: str) -> int:
    return int(
        scalar(
            f"SELECT COUNT(*) FROM inventory_product_categories WHERE category_id = '{cid}'"
        )
    )


def category_is_deleted(cid: str) -> int:
    return int(scalar(f"SELECT is_deleted FROM inventory_category WHERE id = '{cid}'"))


def product_is_alive(pid: str) -> bool:
    return (
        scalar(
            f"SELECT is_deleted::text || is_active::text FROM inventory_product WHERE id = '{pid}'"
        )
        == "01"
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


def run() -> None:
    apply_migrations()

    print("\n# 1. The articles survive the category, and they survive it UNLINKED")
    add_category("drinks")
    add_category("food")
    add_product("beer")
    add_product("wine")
    add_product("bread")
    link("beer", "drinks")
    link("wine", "drinks")
    link("bread", "food")
    check("two articles are in `drinks` before the delete", 2, links_of("drinks"))

    run_command("inventory.categories.delete", category_id="drinks")

    check("the category is gone (soft-delete)", 1, category_is_deleted("drinks"))
    check(
        "the articles are NOT deleted — they only lose the category",
        True,
        product_is_alive("beer"),
    )
    check("…both of them", True, product_is_alive("wine"))
    check("no link is left pointing at the deleted category", 0, links_of("drinks"))
    check("the other category keeps its article", 1, links_of("food"))

    print("\n# 2. The map the POS filters with stops serving the deleted category")
    rows = psql(
        [
            "-tAc",
            f"SELECT COUNT(*) FROM ({(MODULE_DIR / MANIFEST['queries']['inventory.product_categories']['sql']).read_text().strip().rstrip(';').replace(':hub_id', literal(HUB))}) q WHERE category_id = 'drinks'",
        ],
        db=DB,
    ).strip()
    check("`inventory.product_categories` no longer maps anything to it", "0", rows)

    print("\n# 3. The neighbour's category is not reachable from this hub")
    add_category("neighbour-cat", hub_id=OTHER_HUB)
    add_product("neighbour-item", hub_id=OTHER_HUB)
    psql(
        [
            "-c",
            "INSERT INTO inventory_product_categories (product_id, category_id) VALUES ('neighbour-item', 'neighbour-cat')",
        ],
        db=DB,
    )
    run_command(
        "inventory.categories.delete", category_id="neighbour-cat"
    )  # with OUR hub_id
    check(
        "the neighbour's category is untouched", 0, category_is_deleted("neighbour-cat")
    )
    check(
        "and so are its links — unlinking is scoped by the category's hub",
        1,
        links_of("neighbour-cat"),
    )


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
        print(f"FAILED — {len(failures)} broken promise(s) about deleting a category:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — deleting a category unlinks its articles and leaves them alone")
    return 0


if __name__ == "__main__":
    sys.exit(main())
