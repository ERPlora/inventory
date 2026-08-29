#!/usr/bin/env python3
"""The OPERATIVE MODES of stock control in `inventory`, against the REAL kernel — ported from the
hub's `inventory_stock_modes_e2e.rs` (ERPlora/hub#1264, contract «El Hub se CIERRA como KERNEL»
§5). `stock.decrease` is governed by two settings (inventory#6, ADR-0135's frontier) plus the
per-product `low_stock_threshold` precedence:

  1. `track_stock=1` + `allow_sell_without_stock=0` (the defaults): an insufficient decrease is
     REJECTED atomically, by a stable domain CODE (`inventory.insufficient_stock`, ADR-0205) — not
     the silent truncate-to-zero the original bug did — and the stock does not move.
  2. Same mode, a decrease the balance covers still works (regression).
  3. `allow_sell_without_stock=1`: the decrease is allowed and the resulting balance is represented
     as-is, NEGATIVE included — never truncated.
  4. `track_stock=0`: a direct decrease is a no-op (no movement, no balance change) — the chain
     through a real sale/void lives in `listeners.hub.test.py`, since it needs `sales` installed.
  5. The per-product `low_stock_threshold` is seeded from the hub's GLOBAL setting when a create
     omits it, converted to the 10^6 scale.
  6. An explicit per-product threshold still wins over the global default (regression).

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import sys

import hub_harness
from hub_harness import Hub, create_product, product, stock_of, unique


def set_settings(hub: Hub, track: int, allow: int, threshold: int) -> None:
    hub.run(
        "inventory.settings.update",
        {
            "track_stock": track,
            "allow_sell_without_stock": allow,
            "low_stock_threshold": threshold,
        },
    )


def decrease(hub: Hub, product_id: str, qty: int):
    return hub.command(
        "inventory.stock.decrease", {"product_id": product_id, "qty": qty}
    )


def test_insufficient_decrease_is_rejected_atomically(hub: Hub) -> None:
    print(
        "\n1 · an insufficient decrease is refused by CODE and the stock does not move"
    )
    set_settings(hub, 1, 0, 10)
    pid = create_product(
        hub,
        name=unique("Café"),
        sku=unique("CAF"),
        stock=5 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    hub.refused(
        "decreasing 10 of a balance of 5 with overselling not allowed",
        "inventory.stock.decrease",
        {"product_id": pid, "qty": 10 * hub_harness.ONE},
        "inventory.insufficient_stock",
    )
    hub.check(
        "the stock is untouched: neither negative nor truncated to 0",
        stock_of(hub, pid),
        5 * hub_harness.ONE,
    )


def test_sufficient_decrease_still_decreases(hub: Hub) -> None:
    print("\n2 · a decrease the balance covers still works (regression)")
    set_settings(hub, 1, 0, 10)
    pid = create_product(
        hub,
        name=unique("Té"),
        sku=unique("TE"),
        stock=5 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    hub.run("inventory.stock.decrease", {"product_id": pid, "qty": 3 * hub_harness.ONE})
    hub.check("stock after decreasing 3 of 5", stock_of(hub, pid), 2 * hub_harness.ONE)


def test_oversell_allowed_represents_negative_stock(hub: Hub) -> None:
    print(
        "\n3 · with overselling allowed, the balance goes negative and is represented as-is"
    )
    set_settings(hub, 1, 1, 10)
    pid = create_product(
        hub,
        name=unique("Leche"),
        sku=unique("LEC"),
        stock=5 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    hub.run(
        "inventory.stock.decrease", {"product_id": pid, "qty": 10 * hub_harness.ONE}
    )
    hub.check(
        "the oversell is represented as a NEGATIVE balance",
        stock_of(hub, pid),
        -5 * hub_harness.ONE,
    )
    set_settings(hub, 1, 0, 10)


def test_track_off_direct_decrease_is_noop(hub: Hub) -> None:
    print("\n4 · track_stock=0: a direct decrease creates no movement, changes nothing")
    set_settings(hub, 0, 0, 10)
    pid = create_product(
        hub,
        name=unique("Pan"),
        sku=unique("PAN"),
        stock=5 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    hub.run("inventory.stock.decrease", {"product_id": pid, "qty": 3 * hub_harness.ONE})
    hub.check(
        "track_stock=0: no automatic movement",
        stock_of(hub, pid),
        5 * hub_harness.ONE,
    )
    set_settings(hub, 1, 0, 10)


def test_low_stock_threshold_seeds_from_global_settings(hub: Hub) -> None:
    print(
        "\n5 · the GLOBAL threshold seeds a product's threshold when the create omits it"
    )
    set_settings(hub, 1, 0, 25)
    pid = create_product(
        hub, name=unique("Aceite"), sku=unique("ACE"), stock=50 * hub_harness.ONE
    )
    hub.check(
        "a create without an explicit threshold inherits the global, scaled to 10^6",
        product(hub, pid)["low_stock_threshold"],
        25 * hub_harness.ONE,
    )
    set_settings(hub, 1, 0, 10)


def test_explicit_low_stock_threshold_wins_over_global(hub: Hub) -> None:
    print(
        "\n6 · an explicit per-product threshold still wins over the global (regression)"
    )
    set_settings(hub, 1, 0, 25)
    pid = create_product(
        hub,
        name=unique("Sal"),
        sku=unique("SAL"),
        stock=50 * hub_harness.ONE,
        low_stock_threshold=3 * hub_harness.ONE,
    )
    hub.check(
        "the explicit threshold is kept, not overridden by the global",
        product(hub, pid)["low_stock_threshold"],
        3 * hub_harness.ONE,
    )
    set_settings(hub, 1, 0, 10)


def main() -> int:
    hub = Hub("stock.hub")
    print(
        f"Hub battery · stock modes (hub#1264 ← inventory_stock_modes_e2e.rs) · {hub_harness.BASE} "
        f"· hub {hub.hub_id} · user {hub.user}"
    )
    test_insufficient_decrease_is_rejected_atomically(hub)
    test_sufficient_decrease_still_decreases(hub)
    test_oversell_allowed_represents_negative_stock(hub)
    test_track_off_direct_decrease_is_noop(hub)
    test_low_stock_threshold_seeds_from_global_settings(hub)
    test_explicit_low_stock_threshold_wins_over_global(hub)
    return hub.finish(
        "the stock-control modes and threshold precedence hold, against the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
