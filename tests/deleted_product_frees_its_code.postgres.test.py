#!/usr/bin/env python3
"""A deleted product frees its SKU and its EAN-13 (inventory#98), against a REAL Postgres 18 in
Docker.

What the owner saw. Inventory → Products: delete an article, then create it again with the same
code — by hand or by re-importing the CSV — and the save failed with a generic «could not complete
the operation». The deleted article is in no list, so nothing on screen explained the clash: the
runtime redacts the database error (code `db`, hub#1074), and the CSV importer counted the row as
failed. Shopify, Square and Lightspeed let a deleted article's code be used again.

Why. `products.delete` is a SOFT delete (`is_deleted = 1`), but `ix_inventory_product_sku` and
`ix_inventory_product_ean13` were unique over ALL rows, dead ones included. The fix makes both
indexes PARTIAL over the live rows (`WHERE is_deleted = 0`) — the shape the hub's blueprint
importer already reads as a natural key (`export.rs::natural_keys`), which this battery pins too.

What it proves, through the module's own doors (`products.create/update/delete`):
  1. a deleted article's SKU and EAN-13 can be given to a new article;
  2. an EDIT can take the EAN-13 of a deleted article;
  3. two LIVE articles still cannot share a SKU or an EAN-13 (the positive control: without it a
     test that dropped the indexes altogether would pass);
  4. the new migration is re-entrant;
  5. the predicate is the literal `(is_deleted = 0)` the hub's importer knows how to parse.

Usage: tests/deleted_product_frees_its_code.postgres.test.py
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
DB = f"inventory_deleted_code_test_{os.getpid()}"
HUB = "hub-test"
USER = "user-test"
NOW = "2026-09-24T09:00:00+00:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())
NEW_MIGRATION = "migrations/postgres/010_live_rows_hold_the_codes.sql"

failures: list[str] = []


# ── Postgres plumbing (same shape as category_delete.postgres.test.py) ───────────────────


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
    """Anything the caller omits binds as NULL, the way the runtime's driver does (`DynNull`)."""
    return PARAM.sub(lambda m: literal(params.get(m.group(1))), sql)


def run_command(command: str, **params) -> None:
    """Every sheet of the command's `sql[]`, in order, with the system params the runtime injects."""
    for rel in MANIFEST["commands"][command]["sql"]:
        sql = (MODULE_DIR / rel).read_text()
        psql(
            [],
            db=DB,
            stdin=bind(
                sql, {"hub_id": HUB, "current_user_id": USER, "now": NOW, **params}
            ),
        )


def scalar(sql: str) -> str:
    return psql(["-tAc", sql], db=DB).strip()


def create(pid: str, sku: str, ean13: str | None = None) -> None:
    run_command(
        "inventory.products.create",
        new_id=pid,
        name=pid,
        sku=sku,
        ean13=ean13,
        description="",
        product_type="physical",
        price=500,
        cost=0,
        stock=0,
        image="",
    )


def update_ean(pid: str, ean13: str) -> None:
    run_command(
        "inventory.products.update",
        product_id=pid,
        name=pid,
        price=500,
        cost=0,
        low_stock_threshold=10_000_000,
        ean13=ean13,
        description="",
        is_active=1,
    )


def delete(pid: str) -> None:
    run_command("inventory.products.delete", product_id=pid)


def refused(action) -> str | None:
    """The unique-violation text when the database refuses, `None` when it accepts."""
    try:
        action()
    except RuntimeError as exc:
        return str(exc).splitlines()[0]
    return None


def check(label: str, expected, actual) -> None:
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


def check_true(label: str, condition: bool, detail: str = "") -> None:
    if not condition:
        failures.append(f"{label} — {detail}")
        print(f"  FAIL: {label} — {detail}")
    else:
        print(f"  ok: {label}")


# ── The run ──────────────────────────────────────────────────────────────────────────────


def apply_migrations() -> None:
    for rel in (MANIFEST.get("migrations") or {}).get("postgres", []):
        psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())


def live_with_sku(sku: str) -> str:
    return scalar(
        f"SELECT string_agg(id, ',' ORDER BY id) FROM inventory_product "
        f"WHERE hub_id = '{HUB}' AND sku = '{sku}' AND is_deleted = 0"
    )


def run() -> None:
    apply_migrations()

    print("\n# 1. Delete an article, create it again with the same SKU and EAN-13")
    create("coffee-old", "CAF", "8412345678905")
    delete("coffee-old")
    error = refused(lambda: create("coffee-new", "CAF", "8412345678905"))
    check(
        "re-creating with the deleted article's SKU and EAN-13 is accepted", None, error
    )
    check(
        "…and the new article is the only live one with that SKU",
        "coffee-new",
        live_with_sku("CAF"),
    )
    check(
        "…while the deleted one is still there, deleted (history is not lost)",
        "1",
        scalar("SELECT is_deleted FROM inventory_product WHERE id = 'coffee-old'"),
    )

    print("\n# 2. An edit can take the EAN-13 of a deleted article")
    create("tea-old", "TEA", "8412345678912")
    delete("tea-old")
    create("tea-new", "TEA-2")
    error = refused(lambda: update_ean("tea-new", "8412345678912"))
    check("giving a live article the deleted one's EAN-13 is accepted", None, error)

    print("\n# 3. Two LIVE articles still cannot share a code (positive control)")
    error = refused(lambda: create("coffee-twin", "CAF"))
    check_true(
        "a second live article with SKU CAF is refused",
        error is not None and "ix_inventory_product_sku" in error,
        str(error),
    )
    error = refused(lambda: create("coffee-ean-twin", "CAF-3", "8412345678905"))
    check_true(
        "a second live article with the same EAN-13 is refused",
        error is not None and "ix_inventory_product_ean13" in error,
        str(error),
    )

    print(
        "\n# 4. The new migration is re-entrant (a boot that died half-way re-runs it)"
    )
    migration = (MODULE_DIR / NEW_MIGRATION).read_text()
    error = refused(lambda: psql([], db=DB, stdin=migration))
    check("re-applying the migration is a no-op", None, error)
    check(
        "…and the article created in #1 is still the live one",
        "coffee-new",
        live_with_sku("CAF"),
    )

    print(
        "\n# 5. The predicate is the shape the hub's blueprint importer reads as a natural key"
    )
    for index in ("ix_inventory_product_sku", "ix_inventory_product_ean13"):
        predicate = scalar(
            "SELECT pg_get_expr(i.indpred, i.indrelid) FROM pg_index i "
            f"JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = '{index}' AND i.indisunique"
        )
        check(
            f"`{index}` is unique over the live rows only",
            "(is_deleted = 0)",
            predicate,
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
        print(
            f"FAILED — {len(failures)} broken promise(s) about a deleted product's codes:"
        )
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — a deleted product frees its SKU and EAN-13; live ones stay unique")
    return 0


if __name__ == "__main__":
    sys.exit(main())
