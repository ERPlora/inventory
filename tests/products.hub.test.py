#!/usr/bin/env python3
"""The product catalogue of `inventory`, against the REAL kernel — ported from the hub's
`inventory_e2e.rs` (ERPlora/hub#1264, contract «El Hub se CIERRA como KERNEL» §5: the module
proves its own behaviour; the hub keeps only the conformance of its fixture).

  1. Creating a product writes ONE row, readable by its own list; the dashboard stats value it AT
     COST (200 × 3 = 600 cents, asserted as the exact DELTA of the hub-wide totals) the moment it
     exists, and a stock at or below its threshold puts it in `low_stock`.
  2. `products.bulk_create` (a Tier 2/WASM handler) inserts every line in one call and
     autogenerates a SKU (`PROD-NNN`, continuing the sequence from `existing_count`, the explicit
     line keeping its slot) for the ones that did not bring their own.
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
from hub_harness import Hub, cents, create_product, product, unique


def test_creating_a_product_lists_values_and_flags_low_stock(hub: Hub) -> None:
    print(
        "\n1 · a new product is listed, valued at cost, and flagged when stock is low"
    )
    before = hub.query("inventory.products.stats")[0]
    sku = unique("CAF")
    pid = create_product(
        hub,
        name="Café",
        sku=sku,
        price=450,
        cost=200,
        stock=3 * hub_harness.ONE,
        low_stock_threshold=5 * hub_harness.ONE,
    )
    row = product(hub, pid)
    hub.check("name", row.get("name"), "Café")

    # Looked up by its own `f_sku`: `low_stock` pages 50 rows by stock asc, and a long-lived hub
    # may hold more low-stock products than that in front of this one.
    low = hub.query("inventory.products.low_stock", {"f_sku": sku})
    hub.check_true(
        "stock 3 <= threshold 5 puts it in low_stock", len(low) == 1, str(low)
    )

    # The stats are hub-wide sums (other batteries share the tenant), so what THIS test pins is
    # the exact DELTA the new product causes — as strong a check on the arithmetic as the old
    # e2e's absolute 600 on an empty database: valued AT COST (200 × 3 = 600 cents), never at
    # price (450 × 3 = 1350).
    after = hub.query("inventory.products.stats")[0]
    hub.check(
        "total_products grows by exactly this one",
        int(after["total_products"]) - int(before["total_products"]),
        1,
    )
    hub.check(
        "total_inventory_value grows by cost × stock = 200 × 3 = 600 cents (not price × stock)",
        cents(after["total_inventory_value"]) - cents(before["total_inventory_value"]),
        600,
    )


def test_bulk_create_autogenerates_skus_for_missing_ones(hub: Hub) -> None:
    print(
        "\n2 · products.bulk_create (WASM) inserts every line and fills in missing SKUs"
    )
    explicit_sku = unique("TE-1")
    # `existing_count` is what the UI sends — how many products the catalogue already holds — so
    # the generated SKUs CONTINUE the PROD-NNN sequence (handler: `existing + i + 1`, the explicit
    # line keeping its slot). On a shared hub it cannot be a constant: `0` regenerates PROD-001
    # and the second run collides with the UNIQUE (hub_id, sku) index as an opaque `db` error.
    existing = int(hub.query("inventory.products.stats")[0]["total_products"])
    out = hub.run(
        "inventory.products.bulk_create",
        {
            "existing_count": existing,
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
    generated = sorted(s for s in skus if s != explicit_sku)
    hub.check(
        "the other two continue PROD-NNN from existing_count, the explicit line keeping slot 2",
        generated,
        sorted([f"PROD-{existing + 1:03d}", f"PROD-{existing + 3:03d}"]),
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


def test_the_per_article_track_stock_flag_survives_a_null_bind_before_it(hub: Hub) -> None:
    print(
        "\n5 · the per-article `track_stock` can be set through the public door, however many "
        "products were created WITHOUT it first"
    )
    # ADR-0210/inventory#48: `track_stock` is TRI-STATE, so the same command binds the SAME
    # parameter as SQL NULL on one call and as an integer on the next. That is the shape of
    # ERPlora/hub#1348: a `DynNull` (OID 0) bind lets Postgres pick the parameter's type when the
    # statement is PREPARED, a kernel that caches that statement keeps the type per connection, and
    # a later integer on the same slot comes back as `incorrect binary data format in bind
    # parameter 17`. The kernel half is fixed in `develop` (hub#1386); this test is what says the
    # module keeps its own promise on a hub whose image is older than that.
    #
    # 🔴 Why it must ALTERNATE and repeat, not just set the flag once: the cache is per CONNECTION,
    # so a single create decides nothing — it either lands on a poisoned connection or it does not.
    # Alternating fills the pool with statements prepared from a NULL bind and then asks every one
    # of them for an integer. Measured on `ghcr.io/erplora/hub:stable` (26/08) and `:dev` (27/08),
    # both older than the kernel fix, with 20 alternations: 14 and 13 of the integer calls failed.
    #
    # What it costs the business when it breaks: the article never gets its opt-in, so it keeps
    # inheriting the hub switch — and if that switch is off, its sales decrease nothing, in
    # silence. That is the shape inventory#68 reported from the field.
    created = []
    refused = []
    for index in range(16):
        tag = unique("tri")
        payload = {"name": tag, "sku": tag, "stock": 10 * hub_harness.ONE}
        if index % 2:
            payload["track_stock"] = 1
        try:
            created.append((index, create_product(hub, **payload)))
        except AssertionError as err:
            # Recorded, not raised: a battery that dies on the first refusal hides how many of the
            # calls were refused, which is the whole measurement here.
            refused.append(f"#{index} ({'opt-in' if index % 2 else 'inherit'}): {err}")
    hub.check_true(
        "the command never refuses a valid product, with or without the flag",
        not refused,
        f"{len(refused)}/16 refused — {refused[:2]}",
    )

    opted_in = [
        hub_harness.product(hub, product_id)
        for index, product_id in created
        if index % 2
    ]
    hub.check("every article that opted in was created", len(opted_in), 8)
    hub.check_true(
        "…and every one of them kept the flag it was created with",
        bool(opted_in) and all(int(row["track_stock"]) == 1 for row in opted_in),
        str([row.get("track_stock") for row in opted_in]),
    )
    inherited = [
        hub_harness.product(hub, product_id)
        for index, product_id in created
        if not index % 2
    ]
    hub.check_true(
        "…and the ones that said nothing still inherit the hub (NULL, not 0)",
        bool(inherited) and all(row["track_stock"] is None for row in inherited),
        str([row.get("track_stock") for row in inherited]),
    )

    # `products.update` binds the very same tri-state parameter (`COALESCE(CAST(:track_stock …))`),
    # so it carries the same trap and needs the same alternation to expose it: half the calls send
    # the flag, half say nothing and must LEAVE IT ALONE.
    refused_update = []
    for position, (index, product_id) in enumerate(created):
        row = hub_harness.product(hub, product_id)
        payload = {
            "product_id": product_id,
            "name": row["name"],
            "price": row["price"],
            "cost": row["cost"],
            "low_stock_threshold": row["low_stock_threshold"],
            "ean13": row["ean13"],
            "description": row["description"] or "",
            "tax_category_key": row["tax_category_key"],
            "is_active": row["is_active"],
        }
        if position % 2:
            payload["track_stock"] = 0
        try:
            hub.run("inventory.products.update", payload)
        except AssertionError as err:
            refused_update.append(f"#{position}: {err}")
    hub.check_true(
        "`products.update` never refuses the flag either",
        not refused_update,
        f"{len(refused_update)}/{len(created)} refused — {refused_update[:2]}",
    )
    flipped = [
        hub_harness.product(hub, product_id)
        for position, (index, product_id) in enumerate(created)
        if position % 2
    ]
    hub.check_true(
        "…and an update that sends 0 stores 0",
        bool(flipped) and all(int(row["track_stock"]) == 0 for row in flipped),
        str([row.get("track_stock") for row in flipped]),
    )


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
    test_the_per_article_track_stock_flag_survives_a_null_bind_before_it(hub)
    return hub.finish(
        "the catalogue keeps every promise the hub's e2e used to assert, against the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
