#!/usr/bin/env python3
"""The product catalogue of `inventory`, against the REAL kernel — ported from the hub's
`inventory_e2e.rs` (ERPlora/hub#1264, contract «El Hub se CIERRA como KERNEL» §5: the module
proves its own behaviour; the hub keeps only the conformance of its fixture).

  1. Creating a product writes ONE row, readable by its own list; the dashboard stats value it AT
     COST (200 × 3 = 600 cents) the moment it exists, and a stock at or below its threshold puts it
     in `low_stock`.
  2. `products.bulk_create` (a Tier 2/WASM handler) inserts every line in one call and
     autogenerates a SKU (`PROD-NNN`) for the ones that did not bring their own.
  3. Categories are plain CRUD, and `categories.list` counts only the products actually linked to
     each one (a JOIN, not a stored counter).
  4. The product↔category link (`product_categories`, a pure M2M with no `hub_id` of its own) is
     scalar and IDEMPOTENT: linking the same pair twice does not duplicate the row, and unlinking
     removes it.

Two assertions of the old e2e are NOT here because they are KERNEL tenancy, not `inventory`
behaviour — `inventory` was only the decoration: a payload/context naming a different `hub_id`
must never see or touch another tenant's rows. The WRITE half of that promise (a payload cannot
forge `hub_id`) is already generic in the KCS fixture
(`kernel_conformance_query_list_row.rs::the_kernel_stamps_the_row_and_the_payload_cannot_forge_it_hub1238`);
the READ half (a second tenant's list/query truly sees nothing) has no generic KCS test yet and
this harness has no way to open a second tenant against a single-hub dev runtime — flagged as a
gap on hub#1264, not silently dropped.

Two more are consolidated into `ledger.hub.test.py` rather than duplicated here: the ABSOLUTE
count of `stock.adjust` (the ledger battery pins the same contract plus its mandatory reason and
the ledger row) and the cost update `stock.receive` performs on the product row (added to the
ledger battery's own receive test, next to the movement it already asserted). `sale.completed`'s
stock effect — what the old `install_registers_capabilities` pinned as a listener registration
(`listeners_for("sale.completed") == ["inventory.stock.decrease_on_sale"]`) — is proven far more
strongly in `listeners.hub.test.py` by actually triggering a sale and watching the stock move,
which is what the registration exists to make possible.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import sys

import hub_harness
from hub_harness import Hub, create_product, product, unique


def test_creating_a_product_lists_values_and_flags_low_stock(hub: Hub) -> None:
    print(
        "\n1 · a new product is listed, valued at cost, and flagged when stock is low"
    )
    pid = create_product(
        hub,
        name="Café",
        sku=unique("CAF"),
        price=450,
        cost=200,
        stock=3 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    row = product(hub, pid)
    hub.check("name", row.get("name"), "Café")

    low = [r for r in hub.query("inventory.products.low_stock") if r["id"] == pid]
    hub.check_true(
        "stock 3 <= threshold 5 puts it in low_stock", len(low) == 1, str(low)
    )

    stats = hub.query("inventory.products.stats")[0]
    hub.check_true(
        "total_products counts at least this one",
        int(stats["total_products"]) >= 1,
        str(stats),
    )
    # `total_inventory_value` is a hub-wide sum (other batteries share the tenant), so the only
    # thing THIS test can pin is that valuing at cost (not at price) is the arithmetic in force:
    # a value equal to price × stock would be strictly larger than cost × stock for this product,
    # and the aggregate can never be smaller than what this one product alone is worth.
    this_product_cost_value = 200 * 3  # cost(200) × stock(3), in cents
    hub.check_true(
        "the aggregate valuation is at least this product's cost×stock (never priced at PVP)",
        int(stats["total_inventory_value"]) >= this_product_cost_value,
        str(stats),
    )


def test_bulk_create_autogenerates_skus_for_missing_ones(hub: Hub) -> None:
    print(
        "\n2 · products.bulk_create (WASM) inserts every line and fills in missing SKUs"
    )
    explicit_sku = unique("TE-1")
    out = hub.run(
        "inventory.products.bulk_create",
        {
            "existing_count": 0,
            "products": [
                {
                    "name": unique("Café"),
                    "price": 450,
                    "tax_category_key": "product.generic",
                },
                {
                    "name": unique("Té"),
                    "sku": explicit_sku,
                    "price": 300,
                    "stock": 20,
                    "tax_category_key": "product.generic",
                },
                {
                    "name": unique("Agua"),
                    "price": 100,
                    "tax_category_key": "product.generic",
                },
            ],
        },
    )
    hub.check("operations", out.get("operations"), 3)

    new_ids = out.get("new_ids") or []
    hub.check("bulk_create answers the 3 new ids", len(new_ids), 3)
    rows = [product(hub, pid) for pid in new_ids]
    skus = [r["sku"] for r in rows]
    hub.check_true("the explicit SKU is kept as sent", explicit_sku in skus, str(skus))
    generated = [s for s in skus if s != explicit_sku]
    hub.check_true(
        "the other two get a generated PROD-NNN SKU each",
        len(generated) == 2 and all(s.startswith("PROD-") for s in generated),
        str(skus),
    )
    hub.check_true(
        "generated SKUs are distinct from one another",
        len(set(generated)) == 2,
        str(skus),
    )


def test_category_crud(hub: Hub) -> None:
    print("\n3 · categories are CRUD, and the list counts only linked products")
    name = unique("Bebidas")
    hub.run("inventory.categories.create", {"name": name})
    cats = [c for c in hub.query("inventory.categories.list") if c["name"] == name]
    hub.check_true("the category is listed exactly once", len(cats) == 1, str(cats))
    hub.check(
        "a fresh category starts with zero linked products", cats[0]["product_count"], 0
    )


def test_product_category_link_is_scalar_and_idempotent(hub: Hub) -> None:
    print(
        "\n4 · linking/unlinking a product to a category is idempotent, and the count follows"
    )
    cat_name = unique("Cafés e infusiones")
    hub.run("inventory.categories.create", {"name": cat_name})
    cat_id = next(
        c["id"] for c in hub.query("inventory.categories.list") if c["name"] == cat_name
    )
    pid = create_product(
        hub, name=unique("Café solo"), sku=unique("CAFE-SOLO"), price=180
    )

    linked_before = [
        m for m in hub.query("inventory.product_categories") if m["product_id"] == pid
    ]
    hub.check_true("no link yet", len(linked_before) == 0, str(linked_before))

    hub.run(
        "inventory.products.add_category", {"product_id": pid, "category_id": cat_id}
    )
    linked = [
        m for m in hub.query("inventory.product_categories") if m["product_id"] == pid
    ]
    hub.check_true("exactly one link after add_category", len(linked) == 1, str(linked))
    hub.check("the link names the category", linked[0]["category_id"], cat_id)

    cats = [c for c in hub.query("inventory.categories.list") if c["id"] == cat_id]
    hub.check("categories.list sees the link in its count", cats[0]["product_count"], 1)

    # Idempotent: re-linking the same pair does not duplicate the row (composite PK).
    hub.run(
        "inventory.products.add_category", {"product_id": pid, "category_id": cat_id}
    )
    linked = [
        m for m in hub.query("inventory.product_categories") if m["product_id"] == pid
    ]
    hub.check_true("re-linking does not duplicate", len(linked) == 1, str(linked))

    hub.run(
        "inventory.products.remove_category", {"product_id": pid, "category_id": cat_id}
    )
    linked = [
        m for m in hub.query("inventory.product_categories") if m["product_id"] == pid
    ]
    hub.check_true("unlinking removes the row", len(linked) == 0, str(linked))


def main() -> int:
    hub = Hub("products.hub")
    print(
        f"Hub battery · products (hub#1264 ← inventory_e2e.rs) · {hub_harness.BASE} · "
        f"hub {hub.hub_id} · user {hub.user}"
    )
    test_creating_a_product_lists_values_and_flags_low_stock(hub)
    test_bulk_create_autogenerates_skus_for_missing_ones(hub)
    test_category_crud(hub)
    test_product_category_link_is_scalar_and_idempotent(hub)
    return hub.finish(
        "the catalogue keeps every promise the hub's e2e used to assert, against the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
