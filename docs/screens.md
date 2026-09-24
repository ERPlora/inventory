# Inventory — Screens

The module contributes four tabs to the hub navigation — **Dashboard**, **Products**, **Movements**
and **Categories** — plus a **Settings** tab that the shell generates by itself from the declarative
settings block.

## Dashboard

Read-only summary of the catalogue, backed by `inventory.products.stats` and
`inventory.products.low_stock`. Requires `inventory.view_product`.

It shows the counters the hub also publishes as dashboard widgets:

| Widget | Shows |
|---|---|
| Low stock | How many products are at or below their low-stock threshold |
| Inventory value | Value of the stock **at cost**, in euros (stored as cents) |
| Products in stock | How many products have stock above zero |
| Lowest-stock products | The ten products with the least stock left |

The widgets refresh on their own when `inventory.stock_changed`, `inventory.product.created`,
`inventory.product.updated` or `inventory.product.deleted` arrives — you do not have to reload.

## Products

The catalogue. Lists products with their current stock (`inventory.products.list`, 50 rows per page).

- **Search** by name or SKU.
- **Sort** by name, SKU, price, stock or creation date. Default: name, ascending.
- **Filter** by active, product type, price range or stock range.

### Create a product

1. Open **Products** and start a new product.
2. Fill in **name**, **SKU** and **price** — those three are required. The price is entered in euros
   and stored in cents.
3. Choose the **product type**: `physical` (has stock) or `service` (never has stock).
4. Optionally set cost, EAN-13, description, image, initial stock, a per-product low-stock threshold,
   the unit of measure and the tax category.
5. Save. The hub validates the tax category against `taxes` and emits `inventory.product.created`.

Requires `inventory.add_product`.

### Put a product in the POS

1. Create the category first in **Categories** (see below).
2. Open the product and link it to the category — this runs
   `inventory.products.add_category`.
3. The product now appears grouped under that category in the POS catalogue.

A product with no category still sells; it simply is not grouped in the POS menu.

### Import products from a CSV

Dropping the file **creates nothing**. It opens a preview first:

1. **Which column is which.** Headers are matched on their own — in English and in Spanish, accents
   and all (`Nombre`, `Código`, `Precio`, `IVA`) — and every column has a dropdown to correct it or
   to leave it out. **Name** and **SKU** must be mapped; until they are, the import button stays
   disabled, because nothing can be created without them.
2. **The first five rows**, painted under the field each column has been mapped to, so a wrong
   guess is visible before it costs anything.
3. **A dry run over the whole file**: how many rows are ready and, for the rest, the physical line
   number and the reason. Cancelling here leaves the catalogue exactly as it was.

Confirming starts the import. The tax column (`tax`, `tax_category`, `iva`, and similar names) is
resolved to a canonical tax category first; if a value is not recognised — or the file brings no tax
column at all — the hub asks what it means and remembers the answer for next time. **A row with no
tax category is not created**: a product that does not know how it is taxed breaks at the counter.

While it runs there is a counter (`x/N`) and a **Stop** button. Stopping is not silent: the report
says the import was stopped and counts what had already been created.

Rows are created one by one, on purpose: it is the only way to report line by line today. Each row
ends up **created**, **skipped** (a product with that SKU is already in the catalogue — it is left
untouched, so re-importing the same file is safe) or **failed** (with its line and reason), and the
three counters always add up to the rows of the file. A deleted product frees its SKU, so a row
that brings the code of a deleted product creates a new product. The final report is copyable.

Requires `inventory.import_product` and `inventory.add_product`.

## Movements

The stock ledger — every movement that has ever touched stock
(`inventory.stock.movements`, 50 rows per page). Requires `inventory.view_stock`.

Each row carries the signed delta, the resulting balance, the reason and a reference to the document
that caused it. Movement types: `initial`, `reception`, `sale`, `void`, `count`, `decrease`.

- **Search** by product name, SKU or reference.
- **Sort** by date, type, quantity or resulting balance. Default: date, newest first.
- **Filter** by product, movement type, reference or date range.

This screen is **read-only by design**. You cannot edit or delete a movement — see
[concepts.md](concepts.md).

### Count stock (correct a balance)

1. Open **Movements** or the product and start a stock count.
2. Enter the **counted absolute value** — not the difference. If you counted 7 bottles, you type 7.
3. Enter a **reason**; it is mandatory and must be at least 3 characters.
4. Save. The ledger records the difference as a `count` movement and the balance becomes what you
   counted. `inventory.stock_changed` is emitted.

Requires `inventory.adjust_stock`.

### Receive goods

1. Start a reception and add one line per product, with the quantity received and optionally the
   unit cost (in cents).
2. Save. Each line adds a `reception` movement and increases that product's stock.

Lines with a quantity of zero or less, or without a product, are skipped. A reception accepts at
most **200 lines**. Requires `inventory.adjust_stock`.

## Categories

Product categories (`inventory.categories.list`, 50 rows per page). Requires
`inventory.view_category`.

- **Search** by name or slug.
- **Sort** by id, name, slug, icon, colour or product count. Default: name, ascending.
- **Filter** by name, slug, icon, colour or product count range.

A category carries a name, slug, icon, colour, image, description, display order and its own
`tax_category_key`. Creating or changing one requires `inventory.add_category` /
`inventory.change_category`; deleting requires `inventory.delete_category`.

## Settings

The shell renders this tab automatically from the module's settings schema — there is no custom
screen. Requires `inventory.manage_settings`.

| Setting | Meaning | Default |
|---|---|---|
| **Track stock** | Whether the hub keeps stock at all. Off = catalogue-only mode | On |
| **Allow selling without stock** | Whether a sale may push stock below zero | Off |
| **Low-stock threshold** | Global threshold, in whole units, inherited by products that do not set their own | 10 |

## First-run setup

Inventory contributes a **required** setup step called **"Your catalog"**: *Add at least one product
so there is something to sell.* It points at the Products screen and is considered done as soon as
the hub has at least one product. It needs `inventory.add_product`.
