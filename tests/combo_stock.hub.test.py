#!/usr/bin/env python3
"""Selling a MENU moves the stock of its COMPONENTS — against the REAL kernel (inventory#73).

The rule (ADR-0381 rule 8) already has two guards, and neither of them can see the whole chain:

  * `tests/combo_components_stock.postgres.test.py` (inventory#69) fixes the **SQL half**: it calls
    `_decrease_stock` once per component itself, so it asserts what the test decided to decrease,
    never what the handler decided.
  * `sales` carries `stock_movements()`, a **literal port** of this module's reader, in its own
    repo — the contract between the two modules is the EVENT, and `sales` does not depend on
    `inventory`. A port is a mirror, and 🔴 a mirror drifts: the day `inventory` changes how it
    reads the event, the mirror in `sales` stays green and the stock quietly stops moving. That is
    the same silent class of failure this rule was written to remove.

So what is missing is the door that cannot lie: `combos` + `sales` + `inventory` installed for
real, a real sale through `sales.complete_sale`, and the **rows** of `inventory_stock_movement`
read back through the public query.

What each test pins, and why it is written the way it is:

  1. TWO menus, never one. `components[].quantity` is ABSOLUTE and in 10⁶ fixed point (ADR-0147):
     `sales` owns the sale's arithmetic and has already applied the line's multiplier
     (`expand_combo`). 🔴 With a SINGLE menu «absolute» and «per unit of combo» are the same
     integer, so a one-menu test passes just as green under the wrong reading — measured on the
     handler's own suite: scaling the component by the line quantity kept all 46 tests green.
  2. The combo NEVER gets a movement. Its id is not an article, so a movement against it matches no
     row and the SQL still answers `ok` — a MUTE movement, the worst outcome available, because the
     business reads «stock did not change» and keeps selling what it has not got.
  3. A `goods` pack whose components pay different VAT rates is split by `sales` into sibling lines
     (art. 79.Dos LIVA). Each sibling IS a component and carries no `components[]` of its own, so
     each article must be decreased exactly ONCE — grouping the siblings would halve the pack and
     repeating the component list on each would double it.
  4. The void gives back exactly what left, from the LEDGER: a combo's components live in the
     line's snapshot, not in `sales_sale_item` rows, so reading the lines back could not even see
     them.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.

⚠️ Today this battery needs `taxes`, `customers`, `cash_register`, `sales` and `combos` installed
next to `inventory`, and `erplora test --against-hub` mounts and installs a SINGLE directory
(module-toolkit#135): until that lands, the runner cannot even install `inventory` (its `taxes`
dependency is missing) and this file — like every other `*.hub.test.py` of this module — reports
«not run», never green.
"""

import sys

import hub_harness
from hub_harness import Hub, create_product, stock_of, unique, wait_until

ONE = hub_harness.ONE


# ── the chain's fixtures ─────────────────────────────────────────────────────────────────


def make_combo(
    hub: Hub, name: str, supply_kind: str, components: list[str], **overrides
) -> str:
    """A combo with ONE single-choice group per component, so a sale that picks them all sells the
    whole menu. Ids always come from `new_ids`, never composed by hand."""
    payload = {"name": unique(name), "price": 1500, "supply_kind": supply_kind}
    if supply_kind == "service":
        # `ck_combos_combo_single_supply_has_a_rate`: a combo billed as ONE supply owes its own
        # rate, because no component's rate can stand for the closed price.
        payload.setdefault("tax_category_key", "service.generic")
    payload.update(overrides)
    combo_id = new_id(hub, "combos.combos.create", payload)
    for index, product_id in enumerate(components):
        group_id = new_id(
            hub,
            "combos.groups.create",
            {
                "combo_id": combo_id,
                "name": unique(f"g{index}"),
                "min_choices": 1,
                "max_choices": 1,
            },
        )
        new_id(
            hub,
            "combos.options.create",
            {"group_id": group_id, "source": "product", "source_ref": product_id},
        )
    return combo_id


def new_id(hub: Hub, command: str, payload: dict) -> str:
    out = hub.run(command, payload)
    value = (out.get("new_ids") or [None])[0]
    if not isinstance(value, str) or not value:
        raise AssertionError(f"{command} did not answer its id in new_ids[0]: {out}")
    return value


def options_of(hub: Hub, combo_id: str) -> list[str]:
    """Every option of the combo, through `combos`' own flattened query — the same one `sales`
    reads, so the battery picks what a POS would pick."""
    rows = hub.query("combos.options.all")
    return [r["option_id"] for r in rows if r.get("combo_id") == combo_id]


def sell_combo(hub: Hub, cash: str, combo_id: str, quantity: int, key: str) -> str:
    """A REAL sale of `quantity` combos: the POS sends the combo and its picks; the closed price,
    the components and how many lines it becomes are all decided by `sales`."""
    out = hub.run(
        "sales.complete_sale",
        {
            "idempotency_key": unique(key),
            "payment_method_id": cash,
            "items": [
                {
                    "combo_id": combo_id,
                    "product_name": "Menú",
                    "price": 1500,
                    "quantity": quantity,
                    "combo_choices": [
                        {"option_id": o} for o in options_of(hub, combo_id)
                    ],
                }
            ],
        },
    )
    sale_id = (out.get("new_ids") or [None])[0]
    if not isinstance(sale_id, str) or not sale_id:
        raise AssertionError(f"sales.complete_sale did not answer the sale id: {out}")
    return sale_id


def movements(hub: Hub, product_id: str, movement_type: str | None = None) -> list:
    rows = hub.query("inventory.stock.movements", {"f_product_id": product_id})
    return [
        m for m in rows if movement_type is None or m["movement_type"] == movement_type
    ]


def qty_of(movement: dict) -> int:
    """`qty` is a BIGINT and travels back over HTTP as a JSON string as often as a number."""
    return int(movement["qty"])


def three_components(hub: Hub) -> list[str]:
    return [
        create_product(hub, name=unique(n), sku=unique(n), stock=10 * ONE)
        for n in ("primero", "segundo", "postre")
    ]


# ── the tests ────────────────────────────────────────────────────────────────────────────


def test_two_menus_move_one_row_per_component(hub: Hub, cash: str) -> tuple[str, str, list[str]]:
    print("\n1 · two menus of three components → three component rows of 2 units each")
    parts = three_components(hub)
    combo_id = make_combo(hub, "menu-del-dia", "service", parts)

    sale_id = sell_combo(hub, cash, combo_id, 2 * ONE, "two-menus")

    for product_id in parts:
        balance = wait_until(
            lambda p=product_id: stock_of(hub, p), lambda v: v == 8 * ONE
        )
        hub.check(
            "two menus take TWO units of the component, not one", balance, 8 * ONE
        )
        rows = movements(hub, product_id, "sale")
        hub.check_true(
            "exactly one `sale` movement for the component",
            len(rows) == 1,
            str(rows),
        )
        if rows:
            hub.check(
                "…and it books the ABSOLUTE quantity sold (10⁶ fixed point)",
                qty_of(rows[0]),
                -2 * ONE,
            )
            hub.check(
                "…referencing the sale it came from", rows[0]["reference"], sale_id
            )
    return sale_id, combo_id, parts


def test_the_combo_id_never_gets_a_movement(
    hub: Hub, combo_id: str, parts: list[str]
) -> None:
    print(
        "\n2 · the combo id is not an article: it never gets a movement, not even a mute one"
    )
    hub.check_true(
        "no ledger row against the combo id",
        movements(hub, combo_id) == [],
        str(movements(hub, combo_id)),
    )
    total = len([m for p in parts for m in movements(hub, p, "sale")])
    hub.check("the menu wrote three movements and no fourth", total, 3)


def test_voiding_restores_exactly_what_left(
    hub: Hub, sale_id: str, parts: list[str]
) -> None:
    print("\n3 · voiding the menu gives back exactly what left, from the ledger")
    hub.run("sales.void", {"sale_id": sale_id, "reason": unique("void")})
    for product_id in parts:
        balance = wait_until(
            lambda p=product_id: stock_of(hub, p), lambda v: v == 10 * ONE
        )
        hub.check("the component is back to what it was", balance, 10 * ONE)
        rows = movements(hub, product_id, "void")
        hub.check_true("exactly one `void` movement", len(rows) == 1, str(rows))
        if rows:
            hub.check(
                "…giving back the same two units that left", qty_of(rows[0]), 2 * ONE
            )


def test_a_goods_pack_split_across_rates_decrements_each_item_once(
    hub: Hub, cash: str
) -> None:
    print("\n4 · a goods pack split across VAT rates decrements each article ONCE")
    # Different `tax_category_key` + `supply_kind = goods` is what makes `sales` split the line
    # into siblings, one per rate (art. 79.Dos LIVA).
    cafe = create_product(
        hub,
        name=unique("cafe"),
        sku=unique("cafe"),
        stock=10 * ONE,
        tax_category_key="product.generic",
    )
    zumo = create_product(
        hub,
        name=unique("zumo"),
        sku=unique("zumo"),
        stock=10 * ONE,
        tax_category_key="product.reduced",
    )
    combo_id = make_combo(hub, "pack-desayuno", "goods", [cafe, zumo])

    sell_combo(hub, cash, combo_id, 1 * ONE, "goods-pack")

    for product_id, label in ((cafe, "cafe"), (zumo, "zumo")):
        balance = wait_until(
            lambda p=product_id: stock_of(hub, p), lambda v: v == 9 * ONE
        )
        hub.check(f"{label}: one pack takes ONE unit", balance, 9 * ONE)
        rows = movements(hub, product_id, "sale")
        hub.check_true(
            f"{label}: one movement, not one per sibling line",
            len(rows) == 1,
            str(rows),
        )
        if rows:
            hub.check(f"{label}: books its own share", qty_of(rows[0]), -1 * ONE)
    hub.check_true(
        "the pack id gets no movement either",
        movements(hub, combo_id) == [],
        str(movements(hub, combo_id)),
    )


def main() -> int:
    hub = Hub(
        "combo_stock.hub",
        needs=("taxes", "inventory", "customers", "sales", "combos"),
    )
    print(
        f"Hub battery · a MENU moves the stock of its components (inventory#73) · "
        f"{hub_harness.BASE} · hub {hub.hub_id} · user {hub.user}"
    )
    cash = hub_harness.cash_method_id(hub)
    sale_id, combo_id, parts = test_two_menus_move_one_row_per_component(hub, cash)
    test_the_combo_id_never_gets_a_movement(hub, combo_id, parts)
    test_voiding_restores_exactly_what_left(hub, sale_id, parts)
    test_a_goods_pack_split_across_rates_decrements_each_item_once(hub, cash)
    return hub.finish(
        "selling a menu moves its components' stock — and only theirs — against the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
