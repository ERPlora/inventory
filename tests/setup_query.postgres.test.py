#!/usr/bin/env python3
"""Setup-item contract test (inventory#31) — runs against a REAL Postgres 18 in Docker.

`module.json` declares an onboarding checklist item (`setup`, hub#369 / ADR-0222): the runtime runs
`setup.query`, takes the FIRST row and ticks the item when every `configured_when` check passes.
`tests/manifest.contract.test.py` proves the block is well formed; this one proves it is TRUE — that
the query really answers the question the item asks, against real SQL and real rows.

Why it needs a database: everything that can go wrong here is SQL semantics.

  * The declared column has to come back. A `configured_when` field the query does not return is not
    an error on the hub, it is a missing value — and a missing value reads as "not configured"
    forever, so the checklist would nag about a catalog that is already full.
  * An aggregate always answers. `SELECT COUNT(*)` gives a row on an empty table, so "there is a
    row" cannot be the condition (ADR-0063's no-row case never happens here): what decides the item
    is the VALUE, and it has to be laxly falsy on an empty catalog.
  * "≥1 sellable row" is not "≥1 row ever inserted". A product that was archived or deleted is not
    something to sell, and a hub whose catalog is empty again must go back to pending.

The truthiness rule is not this file's invention: it mirrors `truthy()` in
`hub/crates/runtime/src/setup_status.rs` — null, `""`, `0`, `false` and the STRINGS `"0"`/`"false"`
are all empty.

Usage: tests/setup_query.postgres.test.py
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
DB = f"inventory_setup_test_{os.getpid()}"
HUB = "hub-test"

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


def run_setup_query(setup: dict) -> list[dict]:
    """Run `setup.query` the way the runtime does: the query's own SQL, `:hub_id` injected, plus
    whatever static `params` the manifest declares. Rows come back as dicts."""
    qdef = (MANIFEST.get("queries") or {}).get(setup["query"])
    if qdef is None:
        failures.append(f"setup.query: `{setup['query']}` is not declared in `queries`")
        return []
    sql = (MODULE_DIR / qdef["sql"]).read_text().strip().rstrip(";")
    params = {"hub_id": HUB, **(setup.get("params") or {})}
    try:
        out = psql(
            ["-tAc", f"SELECT row_to_json(r) FROM ({bind(sql, params)}) r"], db=DB
        )
    except RuntimeError as exc:
        failures.append(
            f"setup.query: `{setup['query']}` failed to run: {str(exc).splitlines()[0]}"
        )
        return []
    return [json.loads(line) for line in out.splitlines() if line.strip()]


# ── The runtime's verdict, in miniature (`setup_status.rs`) ──────────────────────────────


FALSY_TEXT = {"", "0", "false"}


def truthy(value) -> bool:
    if value is None or value is False:
        return False
    if value is True:
        return True
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() not in FALSY_TEXT


def is_configured(rows: list[dict], checks: list[dict]) -> bool:
    """Configured ⇔ there IS a row and EVERY check passes (ADR-0063). A check that declares neither
    `truthy` nor `equals` never passes: a half-written contract must not tick the item as done."""
    if not rows:
        return False
    row = rows[0]
    for check in checks:
        value = row.get(check["field"])
        if "truthy" in check:
            if truthy(value) != check["truthy"]:
                return False
        elif "equals" in check:
            if str(value) != str(check["equals"]):
                return False
        else:
            return False
    return True


# ── Fixtures ─────────────────────────────────────────────────────────────────────────────


def add_product(pid: str, name: str, sku: str, **overrides) -> None:
    columns = {
        "id": pid,
        "hub_id": HUB,
        "name": name,
        "sku": sku,
        "price": 500,
        "is_active": 1,
        "is_deleted": 0,
        "created_at": "2026-08-07T09:00:00+00:00",
        **overrides,
    }
    cols = ", ".join(columns)
    values = ", ".join(literal(v) for v in columns.values())
    psql(["-c", f"INSERT INTO inventory_product ({cols}) VALUES ({values})"], db=DB)


def clear_catalog() -> None:
    psql(["-c", "DELETE FROM inventory_product"], db=DB)


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


def run() -> None:
    setup = MANIFEST.get("setup")
    if not isinstance(setup, dict):
        failures.append(
            "setup: `module.json` declares no `setup` block, so this module contributes no item to "
            "`hub.setup.status` and a brand-new hub is never told its catalog is empty (inventory#31)"
        )
        return

    checks = setup.get("configured_when") or []
    fields = [c.get("field") for c in checks if isinstance(c, dict)]
    apply_migrations()

    # 1. An empty catalog: the query still answers, with every declared field, and the item is
    #    pending. This is the state of every hub on its first day — the one the checklist exists for.
    rows = run_setup_query(setup)
    check("the query answers with exactly one row on an empty catalog", 1, len(rows))
    if rows:
        for name in fields:
            check(f"`{name}` is a column the query returns", True, name in rows[0])
        check("an empty catalog is NOT configured", False, is_configured(rows, checks))

    # 2. One sellable product is the whole condition: the item ticks.
    add_product("p1", "Coffee", "SKU-1")
    check(
        "one sellable product configures the item",
        True,
        is_configured(run_setup_query(setup), checks),
    )

    # 3. What is not sellable does not count. Archived and soft-deleted rows still sit in the table,
    #    so a naive `COUNT(*)` would keep the item ticked on a catalog with nothing left to sell.
    clear_catalog()
    add_product("p2", "Discontinued", "SKU-2", is_active=0)
    check(
        "an archived product does not configure the item",
        False,
        is_configured(run_setup_query(setup), checks),
    )

    clear_catalog()
    add_product(
        "p3", "Deleted", "SKU-3", is_deleted=1, deleted_at="2026-08-07T10:00:00+00:00"
    )
    check(
        "a soft-deleted product does not configure the item",
        False,
        is_configured(run_setup_query(setup), checks),
    )

    # 4. And a catalog emptied again goes back to pending — the item is state, not a milestone.
    clear_catalog()
    check(
        "an emptied catalog goes back to pending",
        False,
        is_configured(run_setup_query(setup), checks),
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
    finally:
        psql(["-c", f'DROP DATABASE IF EXISTS "{DB}" WITH (FORCE)'])

    print()
    if failures:
        print(f"FAILED — {len(failures)} broken promise(s) in the `setup` item:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — the setup query answers the question the checklist item asks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
