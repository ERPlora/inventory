# Inventory — Concepts

The things people get wrong on their first day.

## Stock is governed by the ledger, not by an editable field

There is no "stock" box you can simply overwrite. Stock is the result of a list of movements:
receptions add, sales subtract, voids give back, counts correct. Every movement is written to
`inventory_stock_movement` in the **same transaction** as the balance change, so the ledger and the
balance can never disagree.

`inventory_product.stock` is a **projection** of that ledger — a cached balance kept for speed, never
a second source of truth.

**A movement, once written, is immutable.** You cannot edit it and you cannot delete it. If a balance
is wrong, you do not fix the history — you add a **stock count** (`inventory.stock.adjust`) that
states the real counted value and leaves a `count` movement explaining the difference. That is why
the reason field on a count is mandatory: it is the only explanation the ledger will ever have.

## A count sets an absolute value, a decrease subtracts

This is the most common mistake.

- **`inventory.stock.adjust` (count)** takes the stock you **counted**. If the system says 5, you
  counted 7 and you send 7, the balance becomes 7 and the ledger records `+2`.
- **`inventory.stock.decrease`** takes the amount to **subtract**. Sending 7 removes 7 units.

If you send a difference to a count you will destroy the balance.

## Three stock modes

The hub can run Inventory in three very different ways, and most "the stock is not moving" questions
are really "we are in another mode".

1. **Not installed** — other modules degrade gracefully; nothing tracks stock.
2. **Track stock off** (`track_stock = 0`) — catalogue-only. Products, prices and categories work
   normally, but nothing ever decreases stock. A sale writes a marker saying "this sale moved no
   stock", so that voiding it later does not put units back that were never taken out.
3. **Full stock control** (`track_stock = 1`) — the default. Sales subtract, and the
   **allow selling without stock** setting decides what happens when there is not enough:
   - **off** — the decrease is rejected with `inventory.insufficient_stock`;
   - **on** — the sale goes through and stock may go negative.

Since #48 the mode is decided **per item**: the product card has a *Track stock for this item*
checkbox (as in Square, Odoo, Shopify or WooCommerce). An item that has never been touched follows
the hub setting; one that says *no* is catalogue-only even if the hub tracks, and one that says
*yes* is tracked even if the hub does not. Untracked items show no balance, never move on a sale or
a void, and never appear in the low-stock list. Services never track.

## Physical products versus services

`product_type` decides whether stock exists at all.

- **`physical`** — has stock, appears in low-stock reports, contributes to the inventory value, is
  decreased when sold and restocked when the sale is voided.
- **`service`** — never has stock. A service line in a sale is skipped by the stock decrease, is
  excluded from low-stock reports and contributes nothing to the inventory value. That is not a bug;
  a haircut has no units in the back room.

## Every amount of money is an integer number of cents

`price`, `cost`, `unit_cost` and `total_inventory_value` are **cents** (ADR-0123). `1250` means
12,50 €. There are no floats and no decimal amounts anywhere in the module. The UI multiplies when
you type and divides when it paints; nothing else does.

## Every quantity is a fixed-point integer scaled by 1 000 000

`stock`, a movement's `qty` and `stock_after`, and the per-product low-stock threshold are stored as
integers multiplied by 10⁶ (ADR-0147). `3000000` is 3 units; `1500000` is 1,5 kg.

This exists so that 0,1 + 0,2 is exactly 0,3 in a shop that sells by weight. The UI converts only at
the human boundary, refuses more than six decimals, and **never rounds silently**.

One exception worth knowing: the **global** low-stock threshold in Settings is a human preference in
whole units (default 10). It is converted to the 10⁶ scale when it is applied to a product.

## Units of measure and the minimum increment

Each product has a base unit (`unit_code`, `ud` by default). Every unit in the hub's catalogue
declares a **minimum increment** — the smallest step you are allowed to move.

If you try to decrease a quantity that does not land on that grid, the hub **rejects it** instead of
rounding. You will be told the quantity is invalid, not quietly given a different number. Units also
carry an exact conversion factor as a fraction (numerator and denominator), never an approximated
decimal.

## The price can refer to a different quantity and a different unit

A product has `price`, `price_quantity_value` and `pricing_unit_code`. The price is the cost of
`price_quantity_value` of `pricing_unit_code` — not necessarily of one base unit.

This is how sub-cent prices work without putting decimals into money: "0,37 € per 100 units" is
stored as `price = 37` with `price_quantity_value = 100000000`. The pricing unit may also differ from
the stock unit — priced per kilo, stocked in grams.

## Tax lives in `taxes`; the product only points at it

A product stores `tax_category_key`, a **stable string** such as `restaurant.food`, `drink` or
`product.generic` — never a percentage and never a numeric "tax type" id. The rate behind that key
lives in the `taxes` module and can change without touching a single product.

Leave it empty and the product falls back to the hub's default category.

Whether a price includes VAT is **a property of the document**, not of the product. It is not stored
per product; it is decided by the sale or the import.

## Deleting a product is a soft delete

`inventory.products.delete` marks the row deleted; it does not erase it. History that references the
product — sales, movements — stays readable. A deleted product disappears from the catalogue and from
the POS, but the ledger entries it produced remain, because the ledger is immutable.

## Only one location exists today

Every movement is booked against a single logical location, created automatically the first time
something moves stock. This is deliberate: the data model is location-ready so the future
`warehouse` module can add real warehouses on top of the same contract without a second ledger. Until
then, "where is it stored" is not a question Inventory can answer.
