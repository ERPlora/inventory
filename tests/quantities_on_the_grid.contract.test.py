#!/usr/bin/env python3
"""The bench refuses a raw count IN WORDS, instead of letting Postgres refuse it as a constraint.

WHY THIS EXISTS (ERPlora/hub#1772). `009_quantity_grid_guard.sql` (inventory#42) put a CHECK on
every quantity column — `stock`, `low_stock_threshold`, the ledger's `qty` and `stock_after` — so a
number that never crossed the 10^6 frontier can no longer be written. The batteries were still
sending whole counts raw (`stock=8`, `qty=3`), and what a reader got was this:

    AssertionError: command inventory.products.create answered 400:
      {'error': {'code': 'db', 'message': 'the request could not be completed'}}

Six batteries died that way for eighteen hours. The message names no column, no value and no way
out — and it CANNOT, on purpose: `crates/server/tests/error_redaction_door.rs` forbids `sqlx`,
`constraint` and `at line` from ever reaching a client, because that door is also the customer's.
So the explanation has to be produced HERE, before the request leaves, where the fixture's own
value is still in hand.

`Hub.run` is the door this guard hangs on, and that choice is the whole design: `run` is the
command that MUST succeed, while `command`/`refused` are the doors a battery uses to prove a
REJECTION. Guarding `run` alone means the happy path is checked and the deliberate off-grid
negatives — `units.hub` sending half a gram onto a gram grid, `listeners.hub` expecting
`sales.quantity_off_grid` — keep working untouched.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import hub_harness  # noqa: E402
from hub_harness import ONE, Hub, on_grid  # noqa: E402


class Recorder(Hub):
    """A hub that never reaches the network: it records what `run` would have sent."""

    def __init__(self):
        self.battery = "contract"
        self.failures = []
        self.user = "u-contract"
        self.hub_id = "hub-contract"
        self.sent = []

    def _request(self, method, path, body=None, *, user=None, permissions=None):
        self.sent.append(body)
        return 200, {"ok": True, "data": {"new_ids": ["p-1"]}}


def main() -> int:
    failures: list[str] = []

    def check(label: str, cond: bool, detail: str = "") -> None:
        print(f"  {'ok' if cond else 'FAIL'}: {label}{'' if cond else f' — {detail}'}")
        if not cond:
            failures.append(label)

    print("\n1 · on_grid: the positive control comes FIRST")
    # A checker that refused everything would pass every other case here and be worthless.
    try:
        kept = on_grid(8 * ONE, "stock")
        check("a legal quantity passes through UNTOUCHED", kept == 8 * ONE, str(kept))
    except AssertionError as err:
        check("a legal quantity passes through UNTOUCHED", False, str(err))
    for legal in (0, ONE, 1_000, -3 * ONE):
        try:
            on_grid(legal, "stock")
            check(f"{legal} is accepted", True)
        except AssertionError as err:
            check(f"{legal} is accepted", False, str(err))

    print("\n2 · on_grid: a raw count is refused, and the message carries the way out")
    try:
        on_grid(8, "stock")
        check("a raw count is refused", False, "on_grid(8) returned instead of raising")
    except AssertionError as err:
        msg = str(err)
        check("a raw count is refused", True)
        check("…the message names the field", "stock" in msg, msg)
        check("…the message names the offending value", "8" in msg, msg)
        check("…the message spells the fix", str(8 * ONE) in msg, msg)

    print("\n3 · Hub.run guards before the request LEAVES")
    hub = Recorder()
    try:
        hub.run("inventory.products.create", {"name": "Vino", "stock": 8})
        check("an off-grid `stock` never reaches the wire", False, str(hub.sent))
    except AssertionError as err:
        check("an off-grid `stock` never reaches the wire", not hub.sent, str(hub.sent))
        check("…and it says so in words, not as a `db` 400", "grid" in str(err), str(err))

    hub = Recorder()
    try:
        hub.run("inventory.stock.receive", {"items": [{"product_id": "p", "qty": 3}]})
        check("an off-grid nested `qty` never reaches the wire", False, str(hub.sent))
    except AssertionError:
        check("an off-grid nested `qty` never reaches the wire", not hub.sent, str(hub.sent))

    hub = Recorder()
    hub.run("inventory.products.create", {"name": "Vino", "stock": 8 * ONE, "price": 121})
    check("a fixture ON the grid goes through", len(hub.sent) == 1, str(hub.sent))

    print("\n4 · the deliberate negatives keep working: `command` is NOT guarded")
    # `units.hub` sends half a gram onto a gram grid and asserts the MODULE refuses it. If the
    # bench refused it first, that test would stop proving anything about the module.
    hub = Recorder()
    status, _ = hub.command("inventory.stock.decrease", {"product_id": "p", "qty": 500})
    check("`command` lets an off-grid payload through to the runtime", status == 200)
    check("…and the runtime is the one that sees it", len(hub.sent) == 1, str(hub.sent))

    print("\n5 · the hub-wide settings singleton is a DIFFERENT scale, and is left alone")
    # `007_quantity_threshold.sql` rescaled «el umbral POR PRODUCTO» and deliberately did not touch
    # `inventory_settings`, which `001` still defaults to 10; `009` puts no CHECK on it either.
    # Guarding it would make the bench wrong about the module rather than strict.
    hub = Recorder()
    hub.run(
        "inventory.settings.update",
        {"track_stock": 1, "allow_sell_without_stock": 0, "low_stock_threshold": 10},
    )
    check("settings.update keeps its raw threshold", len(hub.sent) == 1, str(hub.sent))

    print(
        f"\n{'✓' if not failures else '✗'} quantities_on_the_grid: "
        f"{len(failures)} failure(s)"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
