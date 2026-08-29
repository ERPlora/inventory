#!/usr/bin/env python3
"""ADR-0147 — fixed-point QUANTITIES (10^6 global scale) and the UNITS register, in `inventory`,
against the REAL kernel — ported from the hub's `inventory_units_e2e.rs` (ERPlora/hub#1264,
contract «El Hub se CIERRA como KERNEL» §5). Where this came from: `as_i64(0.5) == 0`, so
`decrease_on_sale` silently did NOT decrement stock for anything sold by weight.

  1. The hub seeds a units register (`ud`, `kg`/`g`/`t`, `l`/`ml`, `min`/`h`), each with its
     conversion factor as an EXACT fraction and its own increment.
  2. A product declares its base unit; undeclared defaults to `ud` (the majority case: a bar sells
     cañas, not kilos of caña).
  3. Quantities travel and are stored at 10^6 scale: half a kilo genuinely decreases half a kilo —
     the exact regression this module exists to fix.
  4. The ledger records movements at the SAME scale as the product's balance.
  5. The increment is VALIDATED, never rounded: an off-grid quantity is refused and the stock is
     untouched.
  6. The master unit survives an `update` that omits it (additive on purpose) and can be changed by
     one that names it explicitly.
  7. A sub-cent price is expressed as an integer amount over a price QUANTITY (KPEIN): "0,37 € per
     100 units", never a decimal in the money column.
  8. Undeclared, the default is "price per ONE unit".

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import sys

import hub_harness
from hub_harness import Hub, create_product, product, stock_of, unique

ONE = hub_harness.ONE


def test_the_hub_seeds_a_units_register(hub: Hub) -> None:
    print(
        "\n1 · the hub carries a seeded units register with exact fractions and increments"
    )
    units = {u["code"]: u for u in hub.query("inventory.units.list")}

    ud = units.get("ud")
    hub.check_true("`ud` is seeded", ud is not None, str(units.keys()))
    hub.check(
        "a loose unit does not split: increment = 1 whole", ud["increment_value"], ONE
    )

    kg = units.get("kg")
    hub.check_true("`kg` is seeded", kg is not None, str(units.keys()))
    hub.check(
        "the kilo's increment is the gram a counter scale gives",
        kg["increment_value"],
        1_000,
    )

    h = units.get("h")
    hub.check_true("`h` is seeded", h is not None, str(units.keys()))
    hub.check("the hour bills in quarters", h["increment_value"], 250_000)
    hub.check("the factor is an EXACT fraction: 1 h = 60/1 min", h["factor_num"], 60)
    hub.check("…", h["factor_den"], 1)


def test_a_product_declares_its_unit_and_defaults_to_ud(hub: Hub) -> None:
    print("\n2 · a product declares its base unit; undeclared is `ud`")
    gambas = create_product(
        hub, name=unique("Gambas"), sku=unique("GAM"), unit_code="kg"
    )
    cana = create_product(hub, name=unique("Cana"), sku=unique("CANA"))

    hub.check("gambas are sold by weight", product(hub, gambas)["unit_code"], "kg")
    hub.check("undeclared, a loose unit", product(hub, cana)["unit_code"], "ud")


def test_half_a_kilo_genuinely_decreases_half_a_kilo(hub: Hub) -> None:
    print(
        "\n3 · half a kilo received, half a kilo sold — the regression this module fixes"
    )
    gambas = create_product(
        hub, name=unique("Gambas"), sku=unique("GAM"), unit_code="kg"
    )

    # `unit_cost: 0` sent explicitly where the old e2e omitted it — see hub#1348 (NULL then a
    # value for the same bind on one pooled connection breaks the runtime's prepared statement).
    hub.run(
        "inventory.stock.receive",
        {"items": [{"product_id": gambas, "qty": ONE // 2 * 5, "unit_cost": 0}]},
    )
    hub.check("2,5 kg received", stock_of(hub, gambas), ONE * 5 // 2)

    # The case that used to be silently truncated to zero: half a kilo (500000 at 10^6 scale).
    hub.run("inventory.stock.decrease", {"product_id": gambas, "qty": ONE // 2})
    hub.check(
        "half a kilo SOLD genuinely decreases half a kilo: 2 kg remain",
        stock_of(hub, gambas),
        2 * ONE,
    )


def test_the_ledger_uses_the_same_scale(hub: Hub) -> None:
    print(
        "\n4 · the movement ledger is in the SAME 10^6 scale as the product's balance"
    )
    gambas = create_product(
        hub, name=unique("Gambas"), sku=unique("GAM"), unit_code="kg"
    )
    hub.run(
        "inventory.stock.receive",
        {"items": [{"product_id": gambas, "qty": ONE // 2, "unit_cost": 0}]},
    )

    movs = hub.query(
        "inventory.stock.movements",
        {"f_product_id": gambas, "f_movement_type": "reception"},
    )
    hub.check_true("a reception movement exists", len(movs) == 1, str(movs))
    hub.check("its delta is in 10^6 scale", movs[0]["qty"], ONE // 2)
    hub.check("…and so is the resulting balance", movs[0]["stock_after"], ONE // 2)


def test_an_off_grid_quantity_is_refused_and_the_stock_is_untouched(hub: Hub) -> None:
    print("\n5 · the increment is VALIDATED, never rounded")
    gambas = create_product(
        hub, name=unique("Gambas"), sku=unique("GAM"), unit_code="kg"
    )
    hub.run(
        "inventory.stock.receive",
        {"items": [{"product_id": gambas, "qty": ONE, "unit_cost": 0}]},
    )

    status, _ = hub.command(
        "inventory.stock.decrease",
        {"product_id": gambas, "qty": 500},  # half a gram, kg's grid is 1 g
    )
    hub.check_true(
        "half a gram does not fall on the gram grid", status != 200, str(status)
    )
    hub.check("the stock was NOT touched", stock_of(hub, gambas), ONE)


def test_the_master_unit_survives_an_update_that_omits_it(hub: Hub) -> None:
    print(
        "\n6 · the master unit is ADDITIVE: an update that omits it keeps the current one"
    )
    gambas = create_product(
        hub, name=unique("Gambas"), sku=unique("GAM"), unit_code="kg"
    )

    hub.run(
        "inventory.products.update",
        {
            "product_id": gambas,
            "name": "Gambas",
            "price": 1200,
            "cost": 0,
            "low_stock_threshold": 5,
            "is_active": 1,
            "ean13": None,
            "description": "",
            "tax_category_key": "product.generic",
        },
    )
    hub.check(
        "unit_code survives an update that does not name it",
        product(hub, gambas)["unit_code"],
        "kg",
    )

    hub.run(
        "inventory.products.update",
        {
            "product_id": gambas,
            "name": "Gambas",
            "price": 1200,
            "cost": 0,
            "low_stock_threshold": 5,
            "is_active": 1,
            "ean13": None,
            "description": "",
            "tax_category_key": "product.generic",
            "unit_code": "ud",
        },
    )
    hub.check(
        "naming it explicitly DOES change the master unit",
        product(hub, gambas)["unit_code"],
        "ud",
    )


def test_a_sub_cent_price_is_an_amount_per_price_quantity(hub: Hub) -> None:
    print(
        "\n7 · KPEIN: a sub-cent price is an integer amount over a price quantity, never a decimal"
    )
    pid = create_product(
        hub,
        name=unique("Tornillo"),
        sku=unique("TOR"),
        price=37,
        price_quantity_value=100 * ONE,
        pricing_unit_code="ud",
    )
    row = product(hub, pid)
    hub.check("the money column is still an integer of cents", row["price"], 37)
    hub.check("…priced per 100 units", row["price_quantity_value"], 100 * ONE)
    hub.check("…of loose units", row["pricing_unit_code"], "ud")


def test_by_default_the_price_is_per_one_unit(hub: Hub) -> None:
    print("\n8 · undeclared, the price is per ONE unit (regression)")
    pid = create_product(hub, name=unique("Cana"), sku=unique("CANA"))
    row = product(hub, pid)
    hub.check(
        "price_quantity_value defaults to ONE unit", row["price_quantity_value"], ONE
    )
    hub.check("pricing_unit_code defaults to `ud`", row["pricing_unit_code"], "ud")


def main() -> int:
    hub = Hub("units.hub")
    print(
        f"Hub battery · units (hub#1264 ← inventory_units_e2e.rs) · {hub_harness.BASE} · "
        f"hub {hub.hub_id} · user {hub.user}"
    )
    test_the_hub_seeds_a_units_register(hub)
    test_a_product_declares_its_unit_and_defaults_to_ud(hub)
    test_half_a_kilo_genuinely_decreases_half_a_kilo(hub)
    test_the_ledger_uses_the_same_scale(hub)
    test_an_off_grid_quantity_is_refused_and_the_stock_is_untouched(hub)
    test_the_master_unit_survives_an_update_that_omits_it(hub)
    test_a_sub_cent_price_is_an_amount_per_price_quantity(hub)
    test_by_default_the_price_is_per_one_unit(hub)
    return hub.finish(
        "fixed-point quantities and the units register hold, against the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
