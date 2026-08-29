#!/usr/bin/env python3
"""The dashboard STATS contract of `inventory`, against the REAL kernel — ported from the hub's
`inventory_stats_e2e.rs` (ERPlora/hub#1264, contract «El Hub se CIERRA como KERNEL» §5).

The old e2e ran each case on a fresh, empty database and asserted absolute totals. A battery
against a real, long-lived hub cannot: other batteries (and other runs) share the same tenant and
leave their own products behind. So every assertion here is a DELTA — before vs. after seeding this
test's own five-product catalogue — which is exactly as strong a check on the SQL's arithmetic and
is immune to whatever else is sitting in the hub:

  * `total_inventory_value` is valued AT COST (inventory#9), in cents, and ONLY for physical
    products with positive stock — a service never valuates and an oversold product (negative
    stock, inventory#6) never SUBTRACTS value. Catalogue: A (stock 10, cost 200 → values 2000),
    B (stock 0), C (stock 2, cost 0 → values 0), D (forced to stock −3 by a REAL oversell),
    S a service (stock 3). Only A adds to the total: +2000.
  * Every other counter is scoped to physical products that TRACK stock (services never do): +5
    products total (services counted too), +4 tracked, +2 in stock (A, C), +2 out of stock
    (B, D), +3 at-or-under threshold (B, C, D), +1 without cost (C).
  * `low_stock` lists exactly the tracked physical products at or under their threshold — B, C
    and D — never a service however low its stock (S), and never a product above its threshold
    (A): the threshold predicate itself is pinned, not just the service exclusion. Each row is
    looked up by its own `f_sku` (the query declares that filter) so the check does not depend on
    what else a long-lived hub shows on the first page.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import sys

import hub_harness
from hub_harness import Hub, create_product, unique


def stats(hub: Hub) -> dict:
    return hub.query("inventory.products.stats")[0]


def as_int(value) -> int:
    """`total_inventory_value` is a money aggregate: Postgres answers `SUM(...)` over integers as
    NUMERIC, which travels as a JSON string. Accept either form."""
    if isinstance(value, str):
        return int(round(float(value)))
    return int(value)


def seed_catalog(hub: Hub, tag: str) -> dict[str, str]:
    """A (physical, in stock, valuates), B (physical, out of stock), C (physical, in stock, no
    cost), D (physical, forced to NEGATIVE stock by a real oversell — inventory#6), S (a service:
    outside every counter). Matches the hub's old `seed_catalog` exactly, in cents/10^6 fixed point.
    Returns the SKU of each product by its letter, unique to this run."""
    skus = {letter: unique(f"{letter}-{tag}") for letter in ("A", "B", "C", "D", "S")}
    create_product(
        hub,
        name=f"A-{tag}",
        sku=skus["A"],
        price=500,
        cost=200,
        stock=10 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    create_product(
        hub,
        name=f"B-{tag}",
        sku=skus["B"],
        price=900,
        cost=300,
        stock=0,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    create_product(
        hub,
        name=f"C-{tag}",
        sku=skus["C"],
        price=700,
        cost=0,
        stock=2 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    d_id = create_product(
        hub,
        name=f"D-{tag}",
        sku=skus["D"],
        price=800,
        cost=400,
        stock=5 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    create_product(
        hub,
        name=f"S-{tag}",
        sku=skus["S"],
        price=1500,
        cost=100,
        stock=3 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
        product_type="service",
    )
    # D goes to stock -3 through a REAL oversell (inventory#6), not a hand-seeded negative value:
    # allow it for this call, then leave the setting as inventory found it (0) for the tests after.
    hub.run(
        "inventory.settings.update",
        {"track_stock": 1, "allow_sell_without_stock": 1, "low_stock_threshold": 10},
    )
    hub.run(
        "inventory.stock.decrease", {"product_id": d_id, "qty": 8 * hub_harness.ONE}
    )
    hub.run(
        "inventory.settings.update",
        {"track_stock": 1, "allow_sell_without_stock": 0, "low_stock_threshold": 10},
    )
    return skus


def test_stats_value_at_cost_excludes_services_and_negative_stock(hub: Hub) -> None:
    print(
        "\n1 · stats value physical, in-stock products AT COST; services/oversold never add"
    )
    before = stats(hub)
    seed_catalog(hub, "stats")
    after = stats(hub)

    def delta(field: str) -> int:
        return as_int(after[field]) - as_int(before[field])

    hub.check(
        "total_inventory_value: only A (cost 200 × stock 10)",
        delta("total_inventory_value"),
        2000,
    )
    hub.check(
        "total_products: the whole catalogue, service included",
        delta("total_products"),
        5,
    )
    hub.check(
        "products_tracked: physical only (S excluded)", delta("products_tracked"), 4
    )
    hub.check("products_in_stock: A and C", delta("products_in_stock"), 2)
    hub.check(
        "products_out_of_stock: B (0) and D (-3, oversold)",
        delta("products_out_of_stock"),
        2,
    )
    hub.check(
        "products_low_stock: B, C and D at/under threshold",
        delta("products_low_stock"),
        3,
    )
    hub.check(
        "products_without_cost: C values at 0 and says so",
        delta("products_without_cost"),
        1,
    )


def test_low_stock_excludes_services(hub: Hub) -> None:
    print(
        "\n2 · low_stock lists B, C and D (at/under threshold) — never the service, never A"
    )
    skus = seed_catalog(hub, "lowstock")

    def listed_as_low_stock(letter: str) -> int:
        return len(hub.query("inventory.products.low_stock", {"f_sku": skus[letter]}))

    hub.check("S: a service is never low stock, no matter its stock", listed_as_low_stock("S"), 0)
    hub.check("B: out of stock (0 <= 5) is listed", listed_as_low_stock("B"), 1)
    hub.check("C: in stock but under threshold (2 <= 5) is listed", listed_as_low_stock("C"), 1)
    hub.check("D: oversold (-3 <= 5) is listed", listed_as_low_stock("D"), 1)
    hub.check(
        "A: above its threshold (10 > 5) is NOT listed — the threshold predicate is live",
        listed_as_low_stock("A"),
        0,
    )


def main() -> int:
    hub = Hub("stats.hub")
    print(
        f"Hub battery · stats (hub#1264 ← inventory_stats_e2e.rs) · {hub_harness.BASE} · "
        f"hub {hub.hub_id} · user {hub.user}"
    )
    test_stats_value_at_cost_excludes_services_and_negative_stock(hub)
    test_low_stock_excludes_services(hub)
    return hub.finish(
        "the dashboard stats keep valuing at cost and excluding services, against the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
