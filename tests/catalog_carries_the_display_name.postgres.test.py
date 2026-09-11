#!/usr/bin/env python3
"""The sale catalogue carries the NAME the row freezes (sales#288) — real Postgres 18 in Docker.

`inventory.products.for_sale` is the catalogue the runtime pre-loads on every sale so that `sales`
does not have to trust the browser (sales#68). Its rows are NARROW on purpose: only what decides
something server-side travels, because this read runs on every single sale.

What made `name`/`sku` decide something: since sales#288 the SERVER writes the line's display
snapshot too, with the same rule as the price — a line naming a catalogue id is named by the
catalogue. Without these two columns `sales` has nothing to write it from, so a line added through
the API with only a `product_id` reached the kitchen display nameless and the pass printed the raw
UUID.

Contract fixed here:

  * `for_sale` projects `name` and `sku` for every article it lists;
  * and keeps projecting what already decided money (`price`, `cost`, `tax_category_key`) plus the
    unit context, so the narrowing rule is not quietly widened beyond the two display columns;
  * a deactivated or deleted article is still not in the catalogue — naming is not a new door.

Usage: tests/catalog_carries_the_display_name.postgres.test.py
  Uses the `erplora-test-pg-5433` container by default (override: ERPLORA_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail.
"""

import json
import os
import pathlib
import subprocess
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
CONTAINER = os.environ.get("ERPLORA_TEST_PG_CONTAINER", "erplora-test-pg-5433")
DB = f"inventory_catalog_name_test_{os.getpid()}"
HUB = "hub-test"
OTHER_HUB = "hub-other"
NOW = "2026-09-11T09:00:00+00:00"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

failures: list[str] = []


def psql(args: list[str], db: str | None = None, stdin: str | None = None) -> str:
    cmd = ["docker", "exec", "-i", CONTAINER, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres"]
    if db:
        cmd += ["-d", db]
    cmd += args
    res = subprocess.run(cmd, input=stdin, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or res.stdout.strip())
    return res.stdout


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def for_sale(hub: str = HUB) -> list[dict]:
    """The query exactly as the runtime runs it: `:hub_id` is injected, never sent."""
    sql = (MODULE_DIR / MANIFEST["queries"]["inventory.products.for_sale"]["sql"]).read_text()
    sql = sql.strip().rstrip(";").replace(":hub_id", literal(hub))
    out = psql(["-tAc", f"SELECT row_to_json(r) FROM ({sql}) r"], db=DB)
    return [json.loads(line) for line in out.splitlines() if line.strip()]


def add_product(pid: str, **overrides) -> None:
    columns = {
        "id": pid,
        "hub_id": HUB,
        "name": pid,
        "sku": pid,
        "price": 500,
        "stock": 0,
        "is_active": 1,
        "is_deleted": 0,
        "tax_category_key": "standard",
        "created_at": NOW,
        **overrides,
    }
    cols = ", ".join(columns)
    values = ", ".join(literal(v) for v in columns.values())
    psql(["-c", f"INSERT INTO inventory_product ({cols}) VALUES ({values})"], db=DB)


def check(label: str, expected, actual) -> None:
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


def apply_migrations() -> None:
    """`erplora test` hands the resolved migration paths over; standalone, the manifest does.

    Every entry is a plain string today, but the object form `{file, kind, since}` is the only way
    to declare a `contract` migration (hub#542), and a loop that takes the entry for a path dies on
    the first one — in another pull request's merge ref, which is where nobody is looking
    (module-toolkit#180).
    """
    published = [p for p in os.environ.get("ERPLORA_MIGRATION_FILES", "").splitlines() if p.strip()]
    entries = published or (MANIFEST.get("migrations") or {}).get("postgres", [])
    for entry in entries:
        rel = entry if isinstance(entry, str) else entry["file"]
        psql([], db=DB, stdin=(MODULE_DIR / rel).read_text())


def run() -> None:
    apply_migrations()

    print("\n# 1. the catalogue names what it sells")
    add_product("p-burger", name="Hamburguesa doble", sku="BUR-2", price=900, cost=400)
    rows = {r["id"]: r for r in for_sale()}
    check("the article is in the catalogue", True, "p-burger" in rows)
    row = rows.get("p-burger", {})
    check("for_sale carries the name the cook reads", "Hamburguesa doble", row.get("name"))
    check("for_sale carries the sku", "BUR-2", row.get("sku"))

    print("\n# 2. and still carries everything that decided money before")
    for column, expected in (
        ("price", 900),
        ("cost", 400),
        ("tax_category_key", "standard"),
        ("track_stock", 1),
    ):
        check(f"for_sale still projects `{column}`", expected, row.get(column))
    for column in ("unit_code", "pricing_unit_code", "price_quantity_value"):
        check(f"for_sale still projects `{column}`", True, column in row)

    print("\n# 3. naming is not a new door")
    add_product("p-off", name="Retirado", is_active=0)
    add_product("p-gone", name="Borrado", is_deleted=1)
    ids = {r["id"] for r in for_sale()}
    check("a deactivated article is still out", False, "p-off" in ids)
    check("a deleted article is still out", False, "p-gone" in ids)

    print("\n# 4. and it is still one hub's catalogue")
    add_product("p-alien", hub_id=OTHER_HUB, name="De otro negocio")
    check("another hub's article is not in this catalogue", False,
          "p-alien" in {r["id"] for r in for_sale()})
    check("and this hub's is not in the other's", False,
          "p-burger" in {r["id"] for r in for_sale(OTHER_HUB)})


def main() -> int:
    try:
        psql(["-c", f'DROP DATABASE IF EXISTS "{DB}"'])
        psql(["-c", f'CREATE DATABASE "{DB}"'])
    except RuntimeError as exc:
        print(f"SKIPPED: no Postgres at `{CONTAINER}`: {str(exc).splitlines()[0]}")
        print("  (docker start erplora-test-pg-5433, or set ERPLORA_TEST_PG_CONTAINER)")
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
        print(f"FAILED — {len(failures)} broken promise(s) about the sale catalogue:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — the sale catalogue names what it sells, and lists nothing new")
    return 0


if __name__ == "__main__":
    sys.exit(main())
