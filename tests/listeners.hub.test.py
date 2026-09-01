#!/usr/bin/env python3
"""`inventory`'s LISTENERS of `sales`' events, against the REAL kernel — the `inventory` half of
the hub's `sales_e2e.rs` (`sale_decrements_stock_via_event`, the stock half of
`media_racion_de_gambas_descuenta_medio_kilo_y_cobra_la_mitad` and of
`una_cantidad_fuera_de_la_rejilla_no_crea_venta_ni_toca_stock`) plus the two "operative mode"
chains of `inventory_stock_modes_e2e.rs` that need a REAL sale to void (ERPlora/hub#1264, contract
«El Hub se CIERRA como KERNEL» §5). What `sales` owes this seam — that it emits `sale.completed`/
`sale.voided` with the right totals — is `sales`' own battery (`checkout.hub.test.py`,
`void.hub.test.py`); what belongs HERE is what `inventory.stock.decrease_on_sale` /
`inventory._restock_on_void` do with those events once the outbox relay delivers them.

`emit` writes the outbox row in the SAME transaction as the command, but the LISTENER only runs
once the runtime's relay picks the row up (a 1 s poll loop the server always runs) — there is no
on-demand drain over HTTP (module-toolkit#135), so every assertion that depends on the listener
having run polls with `hub_harness.wait_until`, bounded and naming what it actually saw if the wait
runs out.

Dropped, and why: the OLD e2e proved the redelivery of the SAME event is idempotent by calling
`rt.drain_outbox()` a second time by hand; there is no way to force a second delivery of an event
the relay already delivered over HTTP, so that specific idempotency proof does not have an
equivalent here — flagged as a gap on hub#1264, not silently dropped.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import sys

import hub_harness
from hub_harness import (
    Hub,
    cash_method_id,
    create_product,
    stock_of,
    unique,
    wait_until,
)

ONE = hub_harness.ONE


def complete_sale(hub: Hub, cash: str, key: str, items: list[dict], **extra) -> str:
    payload = {"idempotency_key": key, "payment_method_id": cash, "items": items}
    payload.update(extra)
    out = hub.run("sales.complete_sale", payload)
    sale_id = (out.get("new_ids") or [None])[0]
    if not isinstance(sale_id, str) or not sale_id:
        raise AssertionError(f"sales.complete_sale did not answer the sale id: {out}")
    return sale_id


def void(hub: Hub, sale_id: str, reason: str) -> None:
    hub.run("sales.void", {"sale_id": sale_id, "reason": reason})


def movements(hub: Hub, product_id: str, **filters) -> list:
    params = {"f_product_id": product_id}
    params.update(filters)
    return hub.query("inventory.stock.movements", params)


def test_a_completed_sale_decrements_stock_via_the_event(hub: Hub, cash: str) -> None:
    print(
        "\n1 · sale.completed reaches inventory.stock.decrease_on_sale and decrements stock"
    )
    pid = create_product(
        hub, name=unique("Café"), sku=unique("CAF"), price=121, cost=50, stock=10 * ONE
    )

    complete_sale(
        hub,
        cash,
        unique("stock-decrement"),
        [
            {
                "product_id": pid,
                "product_name": "Café",
                "price": 121,
                "quantity": 3 * ONE,
                "tax_rate": 21.0,
            }
        ],
    )
    balance = wait_until(lambda: stock_of(hub, pid), lambda v: v == 7 * ONE)
    hub.check(
        "selling 3 of 10 decrements stock to 7 through the relay", balance, 7 * ONE
    )


def test_a_decimal_sale_moves_the_ledger_and_void_reverses_it(
    hub: Hub, cash: str
) -> None:
    print(
        "\n2 · a decimal-quantity sale moves the ledger by the exact amount; void reverses it"
    )
    pid = create_product(
        hub, name=unique("KG"), sku=unique("KG"), unit_code="kg", stock=10 * ONE
    )

    sale_id = complete_sale(
        hub,
        cash,
        unique("decimal-qty"),
        [
            {
                "product_id": pid,
                "product_name": "KG",
                "price": 1000,
                "quantity": ONE * 5 // 2,
                "unit_code": "kg",
                "tax_rate": 21.0,
            }
        ],
    )
    balance = wait_until(lambda: stock_of(hub, pid), lambda v: v == ONE * 15 // 2)
    hub.check("2,5 kg decremented EXACTLY (10^6 fixed point)", balance, ONE * 15 // 2)
    sale_mov = wait_until(
        lambda: next(
            (
                m
                for m in movements(hub, pid, f_movement_type="sale")
                if m["reference"] == sale_id
            ),
            None,
        ),
        lambda m: m is not None,
    )
    hub.check_true(
        "a `sale` movement references this sale", sale_mov is not None, str(sale_mov)
    )
    if sale_mov is not None:
        hub.check(
            "its qty is the negative of what was sold", sale_mov["qty"], -(ONE * 5 // 2)
        )
        hub.check(
            "its stock_after is the balance after the sale",
            sale_mov["stock_after"],
            ONE * 15 // 2,
        )

    void(hub, sale_id, unique("void-reason"))
    balance = wait_until(lambda: stock_of(hub, pid), lambda v: v == 10 * ONE)
    hub.check("voiding restores the full 10 kg", balance, 10 * ONE)
    void_mov = wait_until(
        lambda: next(
            (
                m
                for m in movements(hub, pid, f_movement_type="void")
                if m["reference"] == sale_id
            ),
            None,
        ),
        lambda m: m is not None,
    )
    hub.check_true(
        "a `void` movement references the same sale",
        void_mov is not None,
        str(void_mov),
    )
    if void_mov is not None:
        hub.check(
            "it restores the same quantity that was sold", void_mov["qty"], ONE * 5 // 2
        )


def test_half_a_kilo_sold_decreases_half_a_kilo(hub: Hub, cash: str) -> None:
    print(
        "\n3 · media ración: half a kilo SOLD through a real sale decreases half a kilo"
    )
    pid = create_product(
        hub,
        name=unique("Gambas"),
        sku=unique("GAM"),
        unit_code="kg",
        price=1200,
        cost=800,
        stock=ONE * 5 // 2,
    )

    complete_sale(
        hub,
        cash,
        unique("media-racion"),
        [
            {
                "product_id": pid,
                "product_name": "Gambas",
                "price": 1200,
                "quantity": ONE // 2,
                "unit_code": "kg",
                "unit_name": "Kilogram",
                "increment_value": 1_000,
                "tax_rate": 21.0,
            }
        ],
        tax_included=True,
        amount_tendered=600,
    )
    balance = wait_until(lambda: stock_of(hub, pid), lambda v: v == 2 * ONE)
    hub.check(
        "0,5 kg sold DOES decrease 0,5 kg — 2 kg remain (the bug this fixes)",
        balance,
        2 * ONE,
    )


def test_an_off_grid_sale_is_refused_and_never_touches_stock(
    hub: Hub, cash: str
) -> None:
    print(
        "\n4 · a sale off the unit's grid is refused whole: no sale, no stock movement"
    )
    pid = create_product(
        hub,
        name=unique("Azafrán"),
        sku=unique("AZA"),
        unit_code="kg",
        price=900_000,
        stock=ONE,
    )

    hub.refused(
        "half a gram on a gram grid",
        "sales.complete_sale",
        {
            "idempotency_key": unique("azafran-off-grid"),
            "payment_method_id": cash,
            "items": [
                {
                    "product_id": pid,
                    "product_name": "Azafrán",
                    "price": 900_000,
                    "quantity": 500,
                    "unit_code": "kg",
                    "increment_value": 1_000,
                    "tax_rate": 21.0,
                }
            ],
        },
        "sales.quantity_off_grid",
    )
    hub.check(
        "the rejection does not touch stock, not even async", stock_of(hub, pid), ONE
    )


def test_track_off_sale_makes_no_movement_and_void_does_not_restock(
    hub: Hub, cash: str
) -> None:
    print(
        "\n5 · tracking OFF: a real sale makes no movement, and voiding it does not restock"
    )
    hub.run(
        "inventory.settings.update",
        {"track_stock": 0, "allow_sell_without_stock": 0, "low_stock_threshold": 10},
    )
    pid = create_product(hub, name=unique("Vino"), sku=unique("VIN"), stock=8)

    sale_id = complete_sale(
        hub,
        cash,
        unique("track-off"),
        [
            {
                "product_id": pid,
                "product_name": "Vino",
                "price": 500,
                "quantity": 2 * ONE,
                "tax_rate": 21.0,
            }
        ],
    )
    # Nothing to poll FOR here (a negative never resolves by waiting): the relay tick's worth of
    # slack is given explicitly, then the balance and the ledger must both be exactly as they were.
    wait_until(lambda: len(movements(hub, pid)), lambda n: True, timeout=1.5)
    hub.check("a sale with tracking OFF moves no stock", stock_of(hub, pid), 8)
    hub.check_true(
        "…and leaves no ledger row",
        len(movements(hub, pid)) == 0,
        str(movements(hub, pid)),
    )

    void(hub, sale_id, unique("void-reason"))
    wait_until(lambda: len(movements(hub, pid)), lambda n: True, timeout=1.5)
    hub.check(
        "voiding a sale that never moved stock does not inflate it either",
        stock_of(hub, pid),
        8,
    )
    hub.run(
        "inventory.settings.update",
        {"track_stock": 1, "allow_sell_without_stock": 0, "low_stock_threshold": 10},
    )


def test_track_on_sale_decreases_and_void_restocks(hub: Hub, cash: str) -> None:
    print(
        "\n6 · regression: tracking ON, a real sale decreases and voiding it restocks exactly"
    )
    pid = create_product(hub, name=unique("Queso"), sku=unique("QUE"), stock=8 * ONE)

    sale_id = complete_sale(
        hub,
        cash,
        unique("track-on"),
        [
            {
                "product_id": pid,
                "product_name": "Queso",
                "price": 500,
                "quantity": 2 * ONE,
                "tax_rate": 21.0,
            }
        ],
    )
    balance = wait_until(lambda: stock_of(hub, pid), lambda v: v == 6 * ONE)
    hub.check("tracking ON: the sale decrements", balance, 6 * ONE)

    void(hub, sale_id, unique("void-reason"))
    balance = wait_until(lambda: stock_of(hub, pid), lambda v: v == 8 * ONE)
    hub.check("the void restores the exact amount sold", balance, 8 * ONE)


def test_hub_tracking_off_but_the_article_opts_in_still_decrements(
    hub: Hub, cash: str
) -> None:
    print(
        "\n7 · regression (inventory#68): the hub switch is OFF and the ARTICLE opts in — "
        "a real sale still decrements"
    )
    # The combination the field reported and no end-to-end test had: products created with an
    # explicit `track_stock = 1` while the hub's own setting says 0. Since inventory#48/ADR-0368
    # the hub setting is only the DEFAULT that articles inherit, never the switch that decides the
    # sale, so this MUST decrease.
    #
    # 🔴 Why it needs the real kernel and not another handler unit test: the per-article flag only
    # reaches the handler through `inventory.products.stock_levels`, a read the RUNTIME pre-loads
    # (ADR-0069). Without those rows the handler cannot see the opt-in, falls back to the hub
    # switch and returns before emitting a single operation — no error, no dead letter, nothing in
    # the ledger. That is the silent shape inventory#68 described, and only a live runtime can
    # prove the read arrives.
    hub.run(
        "inventory.settings.update",
        {"track_stock": 0, "allow_sell_without_stock": 0, "low_stock_threshold": 10},
    )
    try:
        pid = create_product(
            hub,
            name=unique("Café"),
            sku=unique("CAF"),
            stock=10 * ONE,
            track_stock=1,
        )
        sale_id = complete_sale(
            hub,
            cash,
            unique("opt-in-vs-hub-off"),
            [
                {
                    "product_id": pid,
                    "product_name": "Café",
                    "price": 121,
                    "quantity": 2 * ONE,
                    "tax_rate": 21.0,
                }
            ],
        )
        balance = wait_until(lambda: stock_of(hub, pid), lambda v: v == 8 * ONE)
        hub.check(
            "an article that opts IN decrements even with the hub switch off", balance, 8 * ONE
        )
        rows = movements(hub, pid, f_movement_type="sale")
        hub.check_true(
            "…and it leaves its `sale` row in the ledger", len(rows) == 1, str(rows)
        )

        void(hub, sale_id, unique("void-reason"))
        balance = wait_until(lambda: stock_of(hub, pid), lambda v: v == 10 * ONE)
        hub.check("…and the void gives back exactly what left", balance, 10 * ONE)
    finally:
        hub.run(
            "inventory.settings.update",
            {"track_stock": 1, "allow_sell_without_stock": 0, "low_stock_threshold": 10},
        )


def main() -> int:
    hub = Hub("listeners.hub", needs=("taxes", "inventory", "customers", "sales"))
    print(
        f"Hub battery · listeners (hub#1264 ← sales_e2e.rs + inventory_stock_modes_e2e.rs) · "
        f"{hub_harness.BASE} · hub {hub.hub_id} · user {hub.user}"
    )
    cash = cash_method_id(hub)
    test_a_completed_sale_decrements_stock_via_the_event(hub, cash)
    test_a_decimal_sale_moves_the_ledger_and_void_reverses_it(hub, cash)
    test_half_a_kilo_sold_decreases_half_a_kilo(hub, cash)
    test_an_off_grid_sale_is_refused_and_never_touches_stock(hub, cash)
    test_track_off_sale_makes_no_movement_and_void_does_not_restock(hub, cash)
    test_track_on_sale_decreases_and_void_restocks(hub, cash)
    test_hub_tracking_off_but_the_article_opts_in_still_decrements(hub, cash)
    return hub.finish(
        "inventory's listeners react to a real sale.completed/sale.voided, against the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
