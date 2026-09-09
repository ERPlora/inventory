#!/usr/bin/env python3
"""`inventory.products.list` filters ON THE SERVER — category, name and sku (inventory#71/#74).

Two holes, one surface, and the same failure mode: a filter the caller sends, the engine drops, and
nobody is told.

  * **inventory#71** — `category_id` was not in `list.filters`, so the POS had no way to ask for one
    category. It downloaded the 280 rows of the catalogue and filtered them in the browser
    (`inventory.product_categories` exists for exactly that), which is what makes the grid measure
    ~20.000 px (ERPlora/sales#178).
  * **inventory#74** (from ERPlora/hub#1182) — `erp-inventory-products.ts` paints a free-text filter
    box on `name` and `sku` (`filterable: true, filterType: 'text'`), and the query declared neither
    as a filter: they were only in `list.search`. The user types in the box and the list does not
    move.

WHAT IS REPRODUCED of the list engine (`hub/crates/runtime/src/queries.rs`), and only that: the base
SELECT wrapped as a derived table (`SELECT sub.*, COUNT(*) OVER() AS _total FROM ( base ) AS sub`)
plus the per-column condition the engine emits FOR THE OP THE MANIFEST DECLARES —
`eq` → `CAST(sub.<col> AS TEXT) = CAST(:f_<col> AS TEXT)`,
`like` → `CAST(sub.<col> AS TEXT) LIKE '%' || CAST(:f_<col> AS TEXT) || '%'`.
Read from the manifest on purpose: take the filter back out, or move its op, and this battery goes
red — which is the whole point of it existing.

## The three traps this battery is built around

1. **A product lives in MANY categories.** `inventory_product_categories` is an M2M with its own
   `add_category`/`remove_category` commands, so an article that is in `drinks` AND in `food` has to
   come back under BOTH. A projection that picks "the" category (a `MIN`, a `LIMIT 1` with no
   predicate) passes the easy case and silently loses that article from one of the two lists.
2. **A prefix is not a match.** Category ids are TEXT. With `c-1` and `c-10` in the same hub, a
   filter built as `LIKE '%<id>%'` over a comma-joined list of ids answers `c-10`'s article when you
   asked for `c-1`. A filter that returns rows that do not belong is worse than one that returns
   none, so the pair is seeded and asserted here rather than left to chance.
3. **The neighbour's rows.** The M2M carries no `hub_id` of its own (it hangs off the product), so
   the join has to stay inside `:hub_id`. Another hub's article, in a category with the SAME id,
   must never appear.

And the control that makes the rest mean something: WITHOUT a filter every seeded row comes back. A
battery that only ever asserts "few rows" passes just as well when the query is broken and returns
nothing.

Usage: tests/list_filters_narrow_on_the_server.postgres.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: INVENTORY_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail.
"""

import json
import os
import pathlib
import re
import subprocess
import sys
import uuid

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text(encoding="utf-8"))
CONTAINER = os.environ.get("INVENTORY_TEST_PG_CONTAINER", "erplora-test-pg-5433")

QUERY = "inventory.products.list"
HUB = "hub-under-test"
OTHER_HUB = "hub-next-door"
NOW = "2026-09-02T10:00:00Z"

IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
PARAM = re.compile(r":([a-z_][a-z0-9_]*)", re.IGNORECASE)

failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)
    print(f"  ✗ {msg}")


def ok(msg: str) -> None:
    print(f"  ✓ {msg}")


def check(what: str, expected, got) -> None:
    if expected == got:
        ok(f"{what}: {got!r}")
    else:
        fail(f"{what}: expected {expected!r}, got {got!r}")


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


# ── Postgres plumbing ────────────────────────────────────────────────────────────────────────

DB = f"inventory_list_filters_{os.getpid()}_{uuid.uuid4().hex[:6]}"


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
        "-X",
    ]
    if db:
        cmd += ["-d", db]
    res = subprocess.run(cmd + args, input=stdin, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or res.stdout.strip())
    return res.stdout


def container_available() -> bool:
    try:
        subprocess.run(
            ["docker", "inspect", CONTAINER], capture_output=True, check=True, text=True
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def create_db() -> None:
    psql(["-c", f'DROP DATABASE IF EXISTS "{DB}"'])
    psql(["-c", f'CREATE DATABASE "{DB}"'])
    for rel in (MANIFEST.get("migrations") or {}).get("postgres", []):
        path = rel if isinstance(rel, str) else rel["file"]
        psql([], db=DB, stdin=(MODULE_DIR / path).read_text(encoding="utf-8"))


def drop_db() -> None:
    try:
        psql(["-c", f'DROP DATABASE IF EXISTS "{DB}" WITH (FORCE)'])
    except RuntimeError as exc:  # pragma: no cover - diagnostics only
        print(f"  ! could not drop {DB}: {exc}")


def rows(sql: str) -> list[dict]:
    out = psql(
        ["-tAc", f"SELECT COALESCE(json_agg(t), '[]'::json) FROM ({sql}) t"], db=DB
    )
    return json.loads(out.strip() or "[]")


# ── the list engine, only the part under test ────────────────────────────────────────────────


def bind(sql: str, params: dict) -> str:
    """One pass over the `:name` placeholders. A param the caller omits binds as NULL, which is what
    the runtime's driver does (`DynNull`, `crates/db/src/lib.rs`) — and the reason an absent filter
    means "no condition" instead of "no rows"."""
    return PARAM.sub(lambda m: literal(params.get(m.group(1))), sql)


def condition(column: str, value: str) -> str:
    """The condition the engine emits for this column, given the op THE MANIFEST declares."""
    filters = ((MANIFEST["queries"][QUERY].get("list") or {}).get("filters")) or {}
    op = (filters.get(column) or {}).get("op")
    if not IDENT.match(column):
        raise RuntimeError(f"{column} is not a plain identifier")
    if op == "eq":
        return f"CAST(sub.{column} AS TEXT) = CAST(:f_{column} AS TEXT)"
    if op == "like":
        return (
            f"CAST(sub.{column} AS TEXT) LIKE '%' || CAST(:f_{column} AS TEXT) || '%'"
        )
    raise RuntimeError(
        f"`{QUERY}` declares no usable filter for `{column}` (op={op!r}): the runtime drops "
        f"`f_{column}` and the caller is filtering nothing"
    )


def list_page(hub: str = HUB, **filters: str) -> list[dict]:
    """`inventory.products.list` as the runtime runs it, with the filters given as `f_<col>`."""
    base = (MODULE_DIR / MANIFEST["queries"][QUERY]["sql"]).read_text(encoding="utf-8")
    base = base.strip().rstrip(";").rstrip()
    conds = [condition(col, value) for col, value in filters.items()]
    where = f" WHERE {' AND '.join(conds)}" if conds else ""
    params = {"hub_id": hub, **{f"f_{col}": value for col, value in filters.items()}}
    sql = f"SELECT sub.*, COUNT(*) OVER() AS _total FROM ( {base} ) AS sub{where} ORDER BY sub.name ASC"
    return rows(bind(sql, params))


def names(page: list[dict]) -> list[str]:
    return sorted(str(r["name"]) for r in page)


def total(page: list[dict]) -> int:
    """The `total` of the envelope: what the pager shows, and what a filter that does not filter
    betrays first."""
    return int(page[0]["_total"]) if page else 0


# ── seed ─────────────────────────────────────────────────────────────────────────────────────

PRODUCT_COLUMNS = (
    "id, hub_id, name, sku, description, product_type, price, cost, stock, low_stock_threshold,"
    " tax_category_key, image, is_active, is_deleted, created_by, updated_by, created_at, updated_at"
)


def product(id_: str, hub: str, name: str, sku: str) -> str:
    return (
        "("
        + ",".join(
            [
                literal(id_),
                literal(hub),
                literal(name),
                literal(sku),
                "''",
                "'physical'",
                "100",
                "50",
                "0",
                # 10 units, in the 10^6 fixed-point scale of ADR-0147 (inventory#42). It read `10`
                # here — a raw count, i.e. 0,00001 units — which is the very shape of value
                # `009_quantity_grid_guard.sql` now refuses; the filters this battery is about do
                # not look at the threshold, so the number was never asserted, only carried.
                "10000000",
                "'standard'",
                "''",
                "1",
                "0",
                "'u1'",
                "'u1'",
                literal(NOW),
                literal(NOW),
            ]
        )
        + ")"
    )


def category(id_: str, hub: str, name: str) -> str:
    return (
        "("
        + ",".join(
            [
                literal(id_),
                literal(hub),
                literal(name),
                literal(name.lower()),
                "'cube-outline'",
                "'#3880ff'",
                "''",
                "''",
                "0",
                "NULL",
                "1",
                "0",
                "'u1'",
                "'u1'",
                literal(NOW),
                literal(NOW),
            ]
        )
        + ")"
    )


def seed() -> None:
    psql(
        [],
        db=DB,
        stdin=(
            f"INSERT INTO inventory_product ({PRODUCT_COLUMNS}) VALUES "
            + ",".join(
                [
                    product("p-beer", HUB, "Beer", "SKU-BEER"),
                    product("p-wine", HUB, "Wine", "SKU-WINE"),
                    product("p-bread", HUB, "Bread", "SKU-BREAD"),
                    # In BOTH categories: the article a "pick one category" projection loses.
                    product("p-combo", HUB, "Breakfast combo", "SKU-COMBO"),
                    # In none: it must survive the unfiltered list and never match a category.
                    product("p-loose", HUB, "Loose item", "SKU-LOOSE"),
                    # The prefix pair of trap 2.
                    product("p-one", HUB, "Prefix one", "SKU-ONE"),
                    product("p-ten", HUB, "Prefix ten", "SKU-TEN"),
                    # The neighbour's article, in a category with the SAME id.
                    product("p-other", OTHER_HUB, "Neighbour beer", "SKU-BEER"),
                ]
            )
            + ";"
        ),
    )
    psql(
        [],
        db=DB,
        stdin=(
            "INSERT INTO inventory_category (id, hub_id, name, slug, icon, color, image, description,"
            ' "order", tax_category_key, is_active, is_deleted, created_by, updated_by, created_at, updated_at) VALUES '
            + ",".join(
                [
                    category("c-drinks", HUB, "Drinks"),
                    category("c-food", HUB, "Food"),
                    category("c-empty", HUB, "Empty"),
                    category("c-1", HUB, "One"),
                    category("c-10", HUB, "Ten"),
                    category("c-drinks-other", OTHER_HUB, "Drinks next door"),
                ]
            )
            + ";"
        ),
    )
    psql(
        [],
        db=DB,
        stdin=(
            "INSERT INTO inventory_product_categories (product_id, category_id) VALUES "
            + ",".join(
                [
                    "('p-beer','c-drinks')",
                    "('p-wine','c-drinks')",
                    "('p-bread','c-food')",
                    "('p-combo','c-drinks')",
                    "('p-combo','c-food')",
                    "('p-one','c-1')",
                    "('p-ten','c-10')",
                    # The neighbour is in THIS hub's category id: only `:hub_id` keeps it out.
                    "('p-other','c-drinks')",
                ]
            )
            + ";"
        ),
    )


# ── the battery ──────────────────────────────────────────────────────────────────────────────

MINE = [
    "Beer",
    "Bread",
    "Breakfast combo",
    "Loose item",
    "Prefix one",
    "Prefix ten",
    "Wine",
]


def run() -> None:
    print("\n# 0. Control: with NO filter the whole catalogue of THIS hub comes back")
    everything = list_page()
    check(
        "the unfiltered list returns every seeded article of the hub",
        MINE,
        names(everything),
    )
    check("and its `total` counts them all", len(MINE), total(everything))
    check(
        "the neighbour's article is not in it (`:hub_id` scoping)",
        False,
        "Neighbour beer" in names(everything),
    )

    print("\n# 1. inventory#71 — `category_id` filters, and it filters ON THE SERVER")
    drinks = list_page(category_id="c-drinks")
    check(
        "`f_category_id=c-drinks` returns only the drinks",
        ["Beer", "Breakfast combo", "Wine"],
        names(drinks),
    )
    check("and the envelope's `total` agrees with the rows", 3, total(drinks))

    print(
        "\n# 2. An article in TWO categories comes back under BOTH (M2M, not 'the' category)"
    )
    food = list_page(category_id="c-food")
    check(
        "`f_category_id=c-food` returns the food",
        ["Bread", "Breakfast combo"],
        names(food),
    )
    check(
        "the two-category article is in both answers",
        True,
        "Breakfast combo" in names(drinks) and "Breakfast combo" in names(food),
    )

    print("\n# 3. A prefix is NOT a match (`c-1` must not answer `c-10`'s article)")
    check(
        "`f_category_id=c-1` returns only its own",
        ["Prefix one"],
        names(list_page(category_id="c-1")),
    )
    check(
        "`f_category_id=c-10` returns only its own",
        ["Prefix ten"],
        names(list_page(category_id="c-10")),
    )

    print("\n# 4. An empty category answers EMPTY, and an unknown one too")
    check(
        "a category with no articles returns nothing",
        [],
        names(list_page(category_id="c-empty")),
    )
    check(
        "its `total` is 0, not the whole catalogue",
        0,
        total(list_page(category_id="c-empty")),
    )
    check(
        "an id that does not exist returns nothing",
        [],
        names(list_page(category_id="c-nope")),
    )

    print(
        "\n# 5. Tenancy: the neighbour never appears, not even under the same category id"
    )
    check(
        "the neighbour's article stays out of this hub's `c-drinks`",
        False,
        "Neighbour beer" in names(drinks),
    )
    check(
        "and this hub's articles stay out of the neighbour's list",
        [],
        names(list_page(hub=OTHER_HUB, category_id="c-food")),
    )

    print(
        "\n# 6. inventory#74 — `name` and `sku` narrow by FRAGMENT (the box says free text)"
    )
    check(
        "`f_name=Bre` narrows to the two that contain it",
        ["Bread", "Breakfast combo"],
        names(list_page(name="Bre")),
    )
    check("and its `total` agrees", 2, total(list_page(name="Bre")))
    check(
        "`f_sku=WINE` narrows to the one article",
        ["Wine"],
        names(list_page(sku="WINE")),
    )
    check("a fragment nobody carries returns nothing", [], names(list_page(name="zzz")))

    print(
        "\n# 7. The filters compose (category AND fragment), the way two boxes do on screen"
    )
    check(
        "`c-drinks` + `Bre` leaves only the combo",
        ["Breakfast combo"],
        names(list_page(category_id="c-drinks", name="Bre")),
    )


def main() -> int:
    if not container_available():
        print(
            f"FAIL: the Postgres container `{CONTAINER}` is not reachable. This battery talks to a "
            "real database on purpose; skipping it would be the green that proves nothing."
        )
        return 1
    create_db()
    try:
        seed()
        run()
    finally:
        drop_db()

    if failures:
        print(f"\nFAIL ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "\nOK: `inventory.products.list` filters by category, name and sku on the server"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
