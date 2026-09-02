#!/usr/bin/env python3
"""The stock-movement LEDGER of `inventory`, against the REAL kernel — ported from the hub's
`inventory_ledger_e2e.rs` (ERPlora/hub#1264, contract «El Hub se CIERRA como KERNEL» §5). Every
change to a product's balance leaves an immutable row in `inventory_stock_movement`, with the
delta, the resulting balance, a reference to the source document and a resolved `location_id`:

  1. `stock.receive` (WASM) writes a `reception` movement and, folded in from the hub's
     `inventory_e2e.rs`, ALSO updates the product's own `cost` from the received line.
  2. `stock.adjust` is an ABSOLUTE recount with a MANDATORY reason (schema-level: no reason, no
     write); the `count` movement records the DIFFERENCE, and recounting the same value twice
     writes nothing the second time.
  3. What did NOT happen leaves no trace: a rejected decrease (insufficient stock) and a decrease
     with `track_stock=0` both leave the ledger untouched.
  4. The movements query is filterable by product and by movement type (the list engine's own
     `f_<column>` filters), and it projects the product's name/sku so the UI can paint it without
     an extra round trip.
  5. Adjusting stock and editing a product are governed by SEPARATE permissions
     (`inventory.adjust_stock` vs `inventory.change_product`) — the dispatcher's generic
     permission gate (`kernel_conformance_permissions.rs`), exercised here with the pair of
     permissions whose separation this module actually depends on: this is the same shape of check
     that first found the `_ensure_location` permission-ceiling crossing the module's own
     `permission_ceiling.contract.test.py` now guards statically.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import sys

import hub_harness
from hub_harness import Hub, create_product, product, stock_of, unique


def movements(hub: Hub, product_id: str, **filters) -> list:
    params = {"f_product_id": product_id}
    params.update(filters)
    return hub.query("inventory.stock.movements", params)


def test_receive_writes_a_reception_movement_and_updates_cost(hub: Hub) -> None:
    print(
        "\n1 · stock.receive writes a `reception` movement AND updates the product's cost"
    )
    pid = create_product(hub, name=unique("REC"), sku=unique("REC"), cost=200, stock=10)

    hub.run(
        "inventory.stock.receive",
        {"items": [{"product_id": pid, "qty": 4, "unit_cost": 180}]},
    )

    hub.check("stock after receiving 4 of 10", stock_of(hub, pid), 14)
    hub.check(
        "the received unit_cost updates the product's cost",
        product(hub, pid)["cost"],
        180,
    )
    movs = movements(hub, pid)
    reception = next((m for m in movs if m["movement_type"] == "reception"), None)
    hub.check_true("a reception movement exists", reception is not None, str(movs))
    hub.check("its qty is the delta received", reception["qty"], 4)
    hub.check("its stock_after is the new balance", reception["stock_after"], 14)
    hub.check("its unit_cost is what was received", reception["unit_cost"], 180)
    hub.check(
        "its location is the hub's resolved default location (`<hub_id>:default`)",
        reception.get("location_id"),
        f"{hub.hub_id}:default",
    )


def test_receiving_without_a_cost_keeps_the_cost_it_had(hub: Hub) -> None:
    print(
        "\n0 · receiving WITHOUT a unit_cost: the movement records none and the cost stands"
    )
    # Goods arrive and nobody types what they cost — the ordinary case at a counter, and the one
    # the batteries had stopped covering: every receive here used to send `unit_cost: 0` explicitly
    # to dodge ERPlora/hub#1348 (the runtime's prepared-statement cache broke when a NULL bind and
    # a typed one met on the same SQL over one pooled connection). The kernel fixed it in
    # ERPlora/hub#1386 (`.persistent(false)` in `build_query!`, three regression tests in
    # `crates/db`), so the workaround came out — and with it back comes the coverage.
    #
    # `0` is NOT the same answer as «no cost»: zero would overwrite the article's cost with zero
    # and put a 0 in the ledger, which is a price, not a blank. Omitting it has to leave the cost
    # the article already had and record NULL in the movement.
    pid = create_product(
        hub, name=unique("NOCOST"), sku=unique("NOC"), cost=500, stock=0
    )

    hub.run("inventory.stock.receive", {"items": [{"product_id": pid, "qty": 3}]})

    hub.check("the stock went up all the same", stock_of(hub, pid), 3)
    hub.check(
        "the article KEEPS the cost it had: omitting the cost is not costing it zero",
        product(hub, pid)["cost"],
        500,
    )
    reception = next(
        (m for m in movements(hub, pid) if m["movement_type"] == "reception"), None
    )
    hub.check_true("a reception movement exists", reception is not None, str(reception))
    hub.check(
        "the ledger records NO unit_cost — a blank, never a 0 €",
        reception["unit_cost"],
        None,
    )

    # ── hub#1348, in the order that used to break it ─────────────────────────────────────────
    # A NULL bind FIRST and a typed one after, on the same statement and the same pooled
    # connection. Verified against a kernel WITHOUT hub#1386 (image of 2026-08-27): this second
    # receive answers HTTP 400 `db` and the stock does not move. It is the positive this test has
    # to keep catching, and the reason the assertion below is here and not in its own battery.
    status, body = hub.command(
        "inventory.stock.receive",
        {"items": [{"product_id": pid, "qty": 2, "unit_cost": 700}]},
    )
    hub.check_true(
        "receiving WITH a cost right after one WITHOUT it is accepted (hub#1348 → hub#1386)",
        status == 200,
        f"HTTP {status}: {body}",
    )
    hub.check("…and the stock adds up both receptions", stock_of(hub, pid), 5)
    hub.check("…and that one DOES set the cost", product(hub, pid)["cost"], 700)


def test_adjust_is_absolute_with_mandatory_reason(hub: Hub) -> None:
    print(
        "\n2 · stock.adjust is an ABSOLUTE recount, the reason is mandatory, no-diff writes nothing"
    )
    pid = create_product(hub, name=unique("CNT"), sku=unique("CNT"), cost=0, stock=10)

    # The schema itself demands a reason (`additionalProperties:false`, `required` — no round trip
    # to the database needed to prove it).
    status, _ = hub.command("inventory.stock.adjust", {"product_id": pid, "stock": 7})
    hub.check_true(
        "a recount without a reason is rejected before touching the row",
        status != 200,
        str(status),
    )

    hub.run(
        "inventory.stock.adjust",
        {"product_id": pid, "stock": 7, "reason": "weekly count: shrinkage"},
    )
    hub.check("the ABSOLUTE value is fixed, not subtracted", stock_of(hub, pid), 7)
    movs = movements(hub, pid, f_movement_type="count")
    hub.check_true("exactly one count movement", len(movs) == 1, str(movs))
    hub.check(
        "the movement records the DIFFERENCE, not the new value", movs[0]["qty"], -3
    )
    hub.check("its stock_after is the counted value", movs[0]["stock_after"], 7)
    hub.check(
        "its reason is kept verbatim", movs[0]["reason"], "weekly count: shrinkage"
    )

    hub.run(
        "inventory.stock.adjust",
        {"product_id": pid, "stock": 7, "reason": "recount, no change"},
    )
    movs = movements(hub, pid, f_movement_type="count")
    hub.check_true(
        "a no-diff recount does not add a second movement", len(movs) == 1, str(movs)
    )


def test_rejected_and_untracked_decreases_leave_no_movement(hub: Hub) -> None:
    print(
        "\n3 · what did NOT happen leaves no trace: a rejection, and tracking turned off"
    )
    pid = create_product(
        hub,
        name=unique("REJ"),
        sku=unique("REJ"),
        cost=0,
        stock=3 * hub_harness.ONE,
        low_stock_threshold=10 * hub_harness.ONE,
    )
    hub.refused(
        "decreasing 9 of a balance of 3, overselling not allowed",
        "inventory.stock.decrease",
        {"product_id": pid, "qty": 9 * hub_harness.ONE},
        "inventory.insufficient_stock",
    )
    hub.check(
        "stock intact after the rejection", stock_of(hub, pid), 3 * hub_harness.ONE
    )
    hub.check_true(
        "a rejection leaves no ledger trace",
        len(movements(hub, pid)) == 0,
        str(movements(hub, pid)),
    )

    hub.run(
        "inventory.settings.update",
        {"track_stock": 0, "allow_sell_without_stock": 0, "low_stock_threshold": 10},
    )
    hub.run("inventory.stock.decrease", {"product_id": pid, "qty": 1 * hub_harness.ONE})
    hub.check_true(
        "tracking off: no movement either",
        len(movements(hub, pid)) == 0,
        str(movements(hub, pid)),
    )
    hub.run(
        "inventory.settings.update",
        {"track_stock": 1, "allow_sell_without_stock": 0, "low_stock_threshold": 10},
    )


def test_movements_query_filters_by_type_and_projects_the_product(hub: Hub) -> None:
    print("\n4 · the ledger query filters by type and reference, and projects name/sku")
    sku = unique("FIL")
    pid = create_product(hub, name="Filtrable", sku=sku, cost=0, stock=10)

    hub.run(
        "inventory.stock.receive",
        {"items": [{"product_id": pid, "qty": 5}]},
    )
    hub.run(
        "inventory.stock.adjust",
        {"product_id": pid, "stock": 12, "reason": "recount"},
    )

    all_movs = movements(hub, pid)
    hub.check("two movements total for this product", len(all_movs), 2)
    hub.check("the ledger projects the product's sku (no N+1)", all_movs[0]["sku"], sku)

    counts = movements(hub, pid, f_movement_type="count")
    hub.check_true(
        "filtering by movement_type narrows to just that type",
        len(counts) == 1,
        str(counts),
    )
    hub.check("the filtered row is the count", counts[0]["movement_type"], "count")


def test_stock_permissions_are_separate_from_product_editing(hub: Hub) -> None:
    print(
        "\n5 · adjusting stock and editing a product are governed by SEPARATE permissions"
    )
    pid = create_product(hub, name=unique("PRM"), sku=unique("PRM"), cost=0, stock=10)

    # A caller who can only EDIT products has no business recounting stock.
    hub.refused_permission_as(
        "an editor without inventory.adjust_stock cannot adjust stock",
        "inventory.change_product",
        "inventory.stock.adjust",
        {"product_id": pid, "stock": 5, "reason": "x"},
    )
    hub.check(
        "the stock was not touched by the refused attempt", stock_of(hub, pid), 10
    )

    # …and a caller who CAN adjust stock does not need product-editing rights to do so, nor to
    # read the ledger back (`inventory.view_stock`).
    counter_perms = "inventory.adjust_stock,inventory.view_stock,inventory.view_product"
    status, _ = hub.command_as(
        counter_perms,
        "inventory.stock.adjust",
        {"product_id": pid, "stock": 5, "reason": "recount"},
    )
    hub.check("a counter with the RIGHT permission succeeds", status, 200)
    hub.check("the stock reflects the counter's recount", stock_of(hub, pid), 5)
    rows = hub.query_as(
        counter_perms, "inventory.stock.movements", {"f_product_id": pid}
    )
    hub.check(
        "the counter reads exactly its own movement (the refused attempt left none)",
        len(rows),
        1,
    )


def main() -> int:
    hub = Hub("ledger.hub")
    print(
        f"Hub battery · ledger (hub#1264 ← inventory_ledger_e2e.rs) · {hub_harness.BASE} · "
        f"hub {hub.hub_id} · user {hub.user}"
    )
    # 🔴 FIRST, and that is load-bearing — not tidiness. What it guards (hub#1348) only bites when
    # the NULL bind is the FIRST use of that statement on a pooled connection: sqlx cached the
    # prepared statement with the types of whatever bound it first. Run after a receive that
    # carries a cost, this test passes even on a kernel WITHOUT hub#1386 — measured, that is
    # exactly what it did — and a guard that only fires in the right order has to be put in it.
    test_receiving_without_a_cost_keeps_the_cost_it_had(hub)
    test_receive_writes_a_reception_movement_and_updates_cost(hub)
    test_adjust_is_absolute_with_mandatory_reason(hub)
    test_rejected_and_untracked_decreases_leave_no_movement(hub)
    test_movements_query_filters_by_type_and_projects_the_product(hub)
    test_stock_permissions_are_separate_from_product_editing(hub)
    return hub.finish(
        "the stock-movement ledger keeps its promises, against the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
