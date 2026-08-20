#!/usr/bin/env python3
"""List-envelope contract test (inventory#57) — a screen that paginates needs a query that paginates.

WHY THIS EXISTS. The Panel contradicted itself on the merchant's first screen: the KPI said
"LOW STOCK 1" and the table 30 px below it said "No products with low stock." Both were reading the
same hub, and neither was erroring. The cause was not the SQL and not the data — it was the
ENVELOPE.

`createListController` is the paginated-list engine of the SDK: it calls `queryPage` and reads
`.rows` / `.total` off the answer. The runtime only composes that `{rows,total,limit,offset}`
envelope for a query that declares a `list` block in the manifest (`queries.rs`, `execute_query`);
a query WITHOUT one answers the bare array its SQL returned. Reading `.rows` off an array is
`undefined`, and `undefined` renders as an empty table — silently. No JS error, no 4xx, no log.

That silence is the whole problem: the mismatch is invisible at runtime, and it is invisible in the
component's own vitest too, because the component test stubs `queryPage` and the stub returns the
envelope the real runtime does not. So the check has to be made where BOTH halves are visible at
once — the UI source that names the query, and the manifest that declares its shape. That is here.

Same family of failure already documented in `customers` ("`queryAll` returns THE ARRAY, not the
`{rows,total}` envelope; reading `.rows` here gave `undefined`") — which is why this is a contract
test over ALL usages, not a one-line fix to one dashboard.

Two checks:

  1. ENVELOPE. Every query this module's UI hands to `createListController` must declare a `list`
     block in `module.json`. Consumer and producer agree, or the gate is red.

  2. NO SELF-PAGINATION. A query that declares `list` must not carry its own `ORDER BY` or `LIMIT`.
     The runtime wraps the base SELECT as a derived table — `SELECT sub.*, COUNT(*) OVER() FROM (
     <base> ) AS sub ... ORDER BY sub.<col> LIMIT :limit OFFSET :offset` — so a `LIMIT 50` inside
     the subquery caps the result set BEFORE pagination ever runs (page 11 would be empty and
     `total` would lie), and an inner `ORDER BY` is dead weight the outer one overrides. Sort order
     belongs in the manifest's `default_sort`/`default_dir`, where the whitelist can vouch for it.

Usage: tests/list_envelope.contract.test.py   (exit 0 = green)
"""

import json
import pathlib
import re
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST_PATH = MODULE_DIR / "module.json"
UI_DIR = MODULE_DIR / "ui"

# `createListController<Row>(erplora(), 'query.name', ...)` — the type argument is optional and the
# call is frequently broken across lines, so the query name is matched as the first string literal
# after the client argument, with whitespace allowed anywhere.
LIST_CONTROLLER_RE = re.compile(
    r"createListController\s*(?:<[^>]*>)?\s*\(\s*[A-Za-z_$][\w$]*\(\)\s*,\s*['\"]([^'\"]+)['\"]",
    re.MULTILINE,
)

# `ORDER BY` / `LIMIT` as free-standing keywords of the OUTERMOST statement. Matched
# case-insensitively on a copy of the SQL with comments stripped, so a `-- ... limit ...` note does
# not raise a false alarm.
SELF_PAGINATION_RE = re.compile(r"\b(ORDER\s+BY|LIMIT)\b", re.IGNORECASE)

failures: list[str] = []
checked_envelope = 0
checked_sql = 0


def strip_sql_comments(sql: str) -> str:
    """Drop `--` line comments and `/* */` block comments. Keywords inside prose are not code."""
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.DOTALL)
    sql = re.sub(r"--[^\n]*", " ", sql)
    return sql


manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
module_id = manifest["id"]
queries = manifest.get("queries", {})

# ── 1. ENVELOPE: every query consumed as a paginated list declares `list` ─────────────────────
consumers: dict[str, list[str]] = {}
for ts in sorted(UI_DIR.rglob("*.ts")):
    if ts.name.endswith(".test.ts"):
        continue
    for name in LIST_CONTROLLER_RE.findall(ts.read_text(encoding="utf-8")):
        consumers.setdefault(name, []).append(str(ts.relative_to(MODULE_DIR)))

if not consumers:
    failures.append(
        "no `createListController` call found in ui/ — either the UI stopped using the list engine "
        "(then delete this test) or the regex went stale (then fix it). A check that matches "
        "nothing is not a passing check."
    )

for name, files in sorted(consumers.items()):
    # Another module's public query is that module's contract to keep, not ours.
    if not name.startswith(f"{module_id}."):
        continue
    checked_envelope += 1
    spec = queries.get(name)
    if spec is None:
        failures.append(
            f"{name}: consumed by `createListController` in {', '.join(files)} but NOT declared in "
            f"module.json `queries`."
        )
    elif "list" not in spec:
        failures.append(
            f"{name}: consumed by `createListController` in {', '.join(files)} — which reads "
            f"`.rows`/`.total` off the answer — but the manifest declares NO `list` block, so the "
            f"runtime answers a bare array. `.rows` on an array is `undefined` and the table renders "
            f"EMPTY with no error (inventory#57). Add the `list` block."
        )

# ── 2. NO SELF-PAGINATION: a `list` query must let the runtime paginate it ────────────────────
for name, spec in sorted(queries.items()):
    if "list" not in spec:
        continue
    sql_rel = spec.get("sql")
    if not sql_rel:
        continue
    sql_path = MODULE_DIR / sql_rel
    if not sql_path.exists():
        failures.append(f"{name}: declared sql `{sql_rel}` does not exist.")
        continue
    checked_sql += 1
    hit = SELF_PAGINATION_RE.search(
        strip_sql_comments(sql_path.read_text(encoding="utf-8"))
    )
    if hit:
        failures.append(
            f"{name}: `{sql_rel}` declares a `list` block but carries its own "
            f"`{hit.group(1).upper()}`. The runtime wraps this SELECT as a derived table and appends "
            f"its own ORDER BY/LIMIT/OFFSET, so an inner LIMIT caps the set BEFORE pagination (later "
            f"pages come back empty and `total` lies) and an inner ORDER BY is overridden. Move the "
            f"order to `list.default_sort`/`default_dir` and drop the LIMIT."
        )

# ── 3. A WIDGET MUST NOT BE STARVED BY THE DEFAULT PAGE ──────────────────────────────────────
#
# A dashboard widget calls `client.query(name, params)` with NO limit (hub `dashboard-widgets.ts`),
# so what it receives is the manifest's `page_size` — not the `options.max` bars it wants to draw.
# Give a `list` block a `page_size` below that `max` and the widget silently draws fewer bars, with
# no error anywhere. This bit during inventory#57: `low_stock` was about to get `page_size: 5` (the
# Panel's own page) while `inventory.low_stock_products` asks for `max: 10`. The Panel passes its 5
# explicitly through `createListController`, so the manifest default is free to serve the widget.
for widget_id, widget in sorted(manifest.get("widgets", {}).items()):
    q_name = widget.get("query")
    spec = queries.get(q_name) if q_name else None
    if not spec or "list" not in spec:
        continue
    page_size = spec["list"].get("page_size")
    wanted = widget.get("options", {}).get("max")
    if page_size is None or wanted is None:
        continue
    if page_size < wanted:
        failures.append(
            f"widget `{widget_id}` draws up to {wanted} rows from `{q_name}`, but that query's "
            f"`list.page_size` is {page_size}. A widget sends no limit, so it would receive "
            f"{page_size} rows and silently draw a shorter list. Raise `page_size` to >= {wanted}."
        )

# ── 4. THE MIRROR TRAP: a pre-loaded `reads` query must NOT be paginated (hub#650) ───────────
#
# The other half of the same coin. A WASM handler pre-loads a query through `commands.<c>.reads`,
# and the runtime hands it the FIRST PAGE when that query declares a `list` block — silently. With
# a 280-product blueprint the handler would decide on 50 rows and think it saw the catalogue. This
# is why `inventory.products.for_sale` and `inventory.products.stock_levels` carry no `list` block
# ON PURPOSE, and it is the exact trap adding a `list` block anywhere could walk into.
reads_queries: dict[str, list[str]] = {}
for cmd_name, cmd in sorted(manifest.get("commands", {}).items()):
    for read in cmd.get("reads", []) or []:
        q = read if isinstance(read, str) else read.get("query")
        if q:
            reads_queries.setdefault(q, []).append(cmd_name)

for q_name, cmds in sorted(reads_queries.items()):
    spec = queries.get(q_name)
    if spec is not None and "list" in spec:
        failures.append(
            f"{q_name}: pre-loaded via `reads` by {', '.join(cmds)} AND declares a `list` block. The "
            f"runtime delivers only the FIRST PAGE to a `reads` (hub#650), so the handler would "
            f"decide on a truncated catalogue without any error. Either drop the `list` block or "
            f"stop pre-loading it."
        )

if failures:
    print(f"FAIL — list envelope contract ({len(failures)}):", file=sys.stderr)
    for f in failures:
        print(f"  ✗ {f}", file=sys.stderr)
    sys.exit(1)

print(
    f"OK — list envelope contract: {checked_envelope} query/queries consumed by "
    f"createListController declare `list`; {checked_sql} `list` query/queries leave pagination to "
    f"the runtime."
)
