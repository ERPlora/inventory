#!/usr/bin/env python3
"""The commercial categories chosen when a product is CREATED are saved with it (inventory#106),
against a REAL Postgres 18 in Docker.

What was shipping: the product form let the user tick categories on a NEW product, but only the
EDIT branch synced the M2M (`products.add_category` per ticked id). The create branch sent
`inventory.products.create` without them, so the product was born with no category and the
category's counter (`categories.list.product_count`) stayed at 0.

The fix links them inside `inventory.products.create` itself — same transaction as the product row,
the way Shopify/Square/Odoo save the collections/categories of an item with the item. This battery
runs every sheet of the command's `sql[]` in order, as the dispatcher does, then reads the counter
through the module's own `categories.list` query.

`category_ids` is bound the way the runtime binds a JSON array: as its JSON TEXT
(`crates/db/src/lib.rs`, `Some(other) => q.bind(other.to_string())`), hence `json.dumps` below.

Usage: tests/product_create_links_categories.postgres.test.py
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
DB = f"inventory_create_links_categories_test_{os.getpid()}"
HUB = "hub-test"
OTHER_HUB = "hub-neighbour"
USER = "user-test"
NOW = "2026-09-26T09:00:00+00:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

failures: list[str] = []


# ── Postgres plumbing (same shape as category_delete.postgres.test.py) ────────────────────


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


# `(?<!:)` so a Postgres cast (`::jsonb`) is never mistaken for a bind.
PARAM = re.compile(r"(?<!:):([a-z_][a-z0-9_]*)", re.IGNORECASE)


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def bind(sql: str, params: dict) -> str:
    """Anything the caller omits binds as NULL, the way the runtime's driver does (`DynNull`)."""
    return PARAM.sub(lambda m: literal(params.get(m.group(1))), sql)


def run_command(command: str, hub_id: str = HUB, **params) -> None:
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


def add_category(cid: str, hub_id: str = HUB) -> None:
    psql(
        [
            "-c",
            f"INSERT INTO inventory_category (id, hub_id, name, slug, is_active, is_deleted, created_at) "
            f"VALUES ('{cid}', '{hub_id}', '{cid}', '{cid}', 1, 0, '{NOW}')",
        ],
        db=DB,
    )


def create_product(pid: str, hub_id: str = HUB, category_ids=None) -> None:
    """Through the module's own door (`inventory.products.create`, every sheet of its `sql[]`)."""
    params = dict(
        new_id=pid,
        name=pid,
        sku=pid,
        ean13=None,
        description="",
        product_type="physical",
        price=1200,
        cost=0,
        stock=0,
        tax_category_key="standard",
        image="",
    )
    if category_ids is not None:
        params["category_ids"] = json.dumps(category_ids)
    run_command("inventory.products.create", hub_id=hub_id, **params)


def product_count(cid: str, hub_id: str = HUB) -> int | None:
    """The counter the Categories tab paints: the module's own `categories.list` query."""
    sql = (
        MODULE_DIR / MANIFEST["queries"]["inventory.categories.list"]["sql"]
    ).read_text()
    sql = bind(sql.strip().rstrip(";"), {"hub_id": hub_id})
    out = scalar(f"SELECT product_count FROM ({sql}) q WHERE id = '{cid}'")
    return int(out) if out else None


def links_of(pid: str) -> list[str]:
    out = scalar(
        f"SELECT string_agg(category_id, ',' ORDER BY category_id COLLATE \"C\") "
        f"FROM inventory_product_categories WHERE product_id = '{pid}'"
    )
    return out.split(",") if out else []


def check(label: str, expected, actual) -> None:
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


def apply_migrations() -> None:
    for rel in (MANIFEST.get("migrations") or {}).get("postgres", []):
        psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())


def run() -> None:
    apply_migrations()

    print(
        "\n# 1. inventory#106: a product created WITH a category counts in that category"
    )
    add_category("dyes")
    add_category("retail")
    check("the category starts empty", 0, product_count("dyes"))
    create_product("tinte-rubio-7", category_ids=["dyes", "retail"])
    check("`dyes` counts the new product (+1)", 1, product_count("dyes"))
    check("`retail` counts it too (N:M)", 1, product_count("retail"))
    check(
        "the product keeps both categories when reopened",
        ["dyes", "retail"],
        links_of("tinte-rubio-7"),
    )

    print("\n# 2. Without categories the create still works and links nothing")
    create_product("no-cat")
    check("absent `category_ids` → no link", [], links_of("no-cat"))
    create_product("empty-cat", category_ids=[])
    check("empty list → no link", [], links_of("empty-cat"))
    check("the counters did not move", 1, product_count("dyes"))

    print("\n# 3. A repeated id links once")
    create_product("twice", category_ids=["dyes", "dyes"])
    check("one link, not two", ["dyes"], links_of("twice"))
    check("the counter moves by one", 2, product_count("dyes"))

    print(
        "\n# 4. Tenancy: another hub's category is never linked, and its rows never count here"
    )
    add_category("neighbour-cat", hub_id=OTHER_HUB)
    create_product("forged", category_ids=["neighbour-cat", "dyes"])
    check(
        "the neighbour's category is NOT linked from this hub",
        ["dyes"],
        links_of("forged"),
    )
    check(
        "the neighbour's counter stays at 0",
        0,
        product_count("neighbour-cat", hub_id=OTHER_HUB),
    )
    create_product(
        "neighbour-item", hub_id=OTHER_HUB, category_ids=["dyes", "neighbour-cat"]
    )
    check(
        "the neighbour cannot link into OUR category",
        ["neighbour-cat"],
        links_of("neighbour-item"),
    )
    check("our counter ignores the neighbour's products", 3, product_count("dyes"))
    # A raw cross-tenant link (no door writes it; legacy/corrupt data): the neighbour's product
    # pointing at OUR category must still not count here — the counter filters by product hub.
    psql(
        [
            "-c",
            "INSERT INTO inventory_product_categories (product_id, category_id) VALUES ('neighbour-item', 'dyes')",
        ],
        db=DB,
    )
    check(
        "…not even a raw cross-hub link counts in our counter", 3, product_count("dyes")
    )
    check(
        "the neighbour's own link counts for the neighbour",
        1,
        product_count("neighbour-cat", hub_id=OTHER_HUB),
    )

    print("\n# 5. A deleted category is not linked")
    add_category("gone")
    psql(
        ["-c", "UPDATE inventory_category SET is_deleted = 1 WHERE id = 'gone'"], db=DB
    )
    create_product("late", category_ids=["gone"])
    check("no link to a deleted category", [], links_of("late"))


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
            f"FAILED — {len(failures)} broken promise(s) about creating a product with categories:"
        )
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "PASS — the categories chosen at creation are saved and counted (inventory#106)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
