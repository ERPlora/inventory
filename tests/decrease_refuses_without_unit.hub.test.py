#!/usr/bin/env python3
"""`inventory.stock.decrease` stops when the hub cannot read the product's unit — against the REAL
kernel (inventory#125).

A decrease is validated against the unit's increment (ADR-0147 §2.2): a product sold by the unit
(`ud`, increment = 1 whole) cannot lose half a unit. The handler gets the unit from the kernel,
which pre-loads the read `inventory.products.unit_of` before the handler runs (ADR-0069). While
that read was declared without `required`, a read that FAILED (the database hiccuped, the query
broke) was silently OMITTED and the handler skipped the grid check altogether: half a can left the
stock and the ledger, with nobody told.

`required` makes the kernel abort the command with `read_unavailable` instead (hub#701), the same
door `taxes.calculate` (taxes#82) and `sales.complete_sale` already use. This battery proves it and
that the decrease recovers once the unit is readable again:

  1. Positive control: with the unit readable, half a unit of a `ud` product is refused and a whole
     unit decreases.
  2. With the units table unreachable, the decrease is refused with `read_unavailable` — off-grid
     and on-grid alike: without the unit nobody can tell which is which — and the stock is untouched.
  3. With the table back, the grid check is in force again and a whole unit decreases.

A product whose unit is simply NOT in the register is a different case: the read answers (an empty
increment) and the handler keeps selling (`product_unit_of.sql`, LEFT JOIN on purpose). Only a read
that fails is refused.

Only a running hub resolves `reads`, and only its database can be broken on purpose: the table is
renamed through the session the runner hands over in `ERPLORA_HUB_PSQL` (module-toolkit#405) and
renamed back in a `finally`, whatever happens in between.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import os
import shlex
import subprocess
import sys
import uuid

import hub_harness
from hub_harness import Hub, create_product, stock_of, unique

ONE = hub_harness.ONE
PSQL = tuple(shlex.split(os.environ.get("ERPLORA_HUB_PSQL", "")))

UNITS_TABLE = "inventory_unit"
# Unique per run: a previous run that died between the two renames must not collide with this one.
HIDDEN_TABLE = f"inventory_unit_hidden_{uuid.uuid4().hex[:8]}"
# Half a loose unit: on the table's quantity grid (a multiple of 1 000), off the `ud` increment.
HALF = ONE // 2


def psql(sql: str) -> str:
    done = subprocess.run(
        [*PSQL, "-tAc", sql], capture_output=True, text=True, timeout=60, check=False
    )
    if done.returncode != 0:
        raise AssertionError(
            f"psql `{sql}` exited {done.returncode}: {done.stderr.strip()}"
        )
    return done.stdout.strip()


def decrease(hub: Hub, product_id: str, qty: int):
    return hub.command(
        "inventory.stock.decrease", {"product_id": product_id, "qty": qty}
    )


def expect_off_grid(hub: Hub, label: str, product_id: str) -> None:
    status, body = decrease(hub, product_id, HALF)
    code = (
        ((body or {}).get("error") or {}).get("code")
        if isinstance(body, dict)
        else None
    )
    # Refused by the GRID, not by the read: `read_unavailable` here would mean the unit was not
    # read at all, and then this control would not be telling the two cases apart. Since
    # inventory#129 the grid speaks its own code (409), so the check is exact.
    hub.check_true(
        f"{label} (code {code})",
        status == 409 and code == "inventory.off_grid_quantity",
        f"HTTP {status}: {body}",
    )


def main() -> int:
    hub = Hub("decrease_refuses_without_unit.hub")
    print(
        f"Hub battery · decrease without the unit (inventory#125) · {hub_harness.BASE} · "
        f"hub {hub.hub_id} · user {hub.user}"
    )
    if not PSQL:
        print(
            "decrease_refuses_without_unit.hub: hub_psql_missing — ERPLORA_HUB_PSQL is empty. The "
            "runner has to hand over a session on the hub's database; without it the read cannot "
            "be broken on purpose."
        )
        return 1
    # The session must open THIS hub's database, or renaming the table proves nothing.
    seeded = psql(f"SELECT count(*) FROM {UNITS_TABLE} WHERE hub_id = '{hub.hub_id}'")
    if not seeded.isdigit() or int(seeded) == 0:
        print(
            f"decrease_refuses_without_unit.hub: ERPLORA_HUB_PSQL shows no `{UNITS_TABLE}` rows "
            f"for hub {hub.hub_id} ({seeded!r})"
        )
        return 1

    can = create_product(hub, name=unique("Lata"), sku=unique("LATA"), unit_code="ud")
    hub.run("inventory.stock.receive", {"items": [{"product_id": can, "qty": 5 * ONE}]})

    print("\n1 · unit readable: the grid decides (positive control)")
    expect_off_grid(hub, "half a can is refused while the unit is readable", can)
    hub.run("inventory.stock.decrease", {"product_id": can, "qty": ONE})
    hub.check("a whole can decreases: 4 remain", stock_of(hub, can), 4 * ONE)

    print(
        "\n2 · unit unreadable: the decrease stops instead of skipping the grid (inventory#125)"
    )
    psql(f"ALTER TABLE {UNITS_TABLE} RENAME TO {HIDDEN_TABLE}")
    try:
        hub.refused(
            "half a can without the unit",
            "inventory.stock.decrease",
            {"product_id": can, "qty": HALF},
            "read_unavailable",
        )
        hub.refused(
            "a whole can without the unit",
            "inventory.stock.decrease",
            {"product_id": can, "qty": ONE},
            "read_unavailable",
        )
    finally:
        psql(f"ALTER TABLE {HIDDEN_TABLE} RENAME TO {UNITS_TABLE}")
    hub.check(
        "the stock was NOT touched while the unit was unreadable",
        stock_of(hub, can),
        4 * ONE,
    )

    print("\n3 · unit readable again: the decrease recovers")
    expect_off_grid(hub, "half a can is refused again once the unit is back", can)
    hub.run("inventory.stock.decrease", {"product_id": can, "qty": ONE})
    hub.check("a whole can decreases again: 3 remain", stock_of(hub, can), 3 * ONE)

    return hub.finish(
        "a decrease never skips the unit's grid: an unreadable unit refuses with read_unavailable"
    )


if __name__ == "__main__":
    sys.exit(main())
