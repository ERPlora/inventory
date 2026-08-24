# Inventory — Limits and troubleshooting

## Errors you will actually see

| Error | What happened | What to do |
|---|---|---|
| `inventory.insufficient_stock` (HTTP 409) | A decrease asked for more units than there are, and **allow selling without stock** is off | Receive the goods first, count the real stock, or turn on selling without stock in Settings |
| `inventory.unknown_product` (HTTP 409) | The decrease pointed at a product that does not exist or is deleted | Check the product id; a soft-deleted product cannot be decreased |
| Quantity rejected as invalid | The quantity does not fall on the minimum increment of the product's unit | Send a quantity that is a multiple of the unit's increment — the hub will not round it for you |
| Tax category rejected on save | `tax_category_key` does not exist in `taxes` | Create the category in `taxes` first, or leave the field empty to use the hub default |
| Duplicate SKU or EAN-13 on save | SKU and EAN-13 are unique per hub | Use a different code; a soft-deleted product still holds its code |

A rejected decrease does **not** emit `inventory.stock_changed`, so dashboards and widgets will not
flicker on a failure.

## Caps and sizes

| Limit | Value |
|---|---|
| Products per bulk import | 100 |
| Lines per goods reception | 200 |
| Rows per page (products, categories, movements) | 50 |
| Maximum rows a paginated request may ask for | 500 |
| Decimals accepted in a quantity | 6 |
| Reason on a stock count | 3 to 500 characters, mandatory |
| Product name | up to 200 characters |
| SKU | up to 100 characters |
| EAN-13 | up to 13 characters |

`inventory.products.for_sale` is **not paginated on purpose** — it must return the whole catalogue,
because a partial catalogue would price sale lines wrongly.

## Permissions per action

| To do this | You need |
|---|---|
| See products and categories | `inventory.view_product`, `inventory.view_category` |
| See the movement ledger | `inventory.view_stock` |
| Create / change / delete a product | `inventory.add_product` / `inventory.change_product` / `inventory.delete_product` |
| Create / change / delete a category | `inventory.add_category` / `inventory.change_category` / `inventory.delete_category` |
| Link or unlink a product and a category | `inventory.add_category` |
| Count stock or receive goods | `inventory.adjust_stock` |
| Import or export products | `inventory.import_product` / `inventory.export_product` |
| Change the module settings | `inventory.manage_settings` |

By role: **admin** has everything. **manager** has everything except what only admin holds — in
practice the full list above. **employee** is read-only: products, categories and the stock ledger,
nothing else. An employee cannot count stock, receive goods or change a price.

## Dependencies — what breaks if something is missing

**`taxes` is required.** Installing Inventory installs it automatically, and **you cannot uninstall
`taxes` while Inventory is installed** — every product points at a tax category and the hub validates
that pointer on every save.

**`sales` is optional but expected.** Without it nothing emits `sale.completed`, so stock never moves
by itself; you would have to count or receive manually. With it installed:

- a completed sale decreases the stock of its physical lines, and of the **components** of any
  composed line (a menu, a pack), never of the composed article itself;
- a voided sale puts those units back, once and only once — a repeated `sale.voided` delivery cannot
  double-restock, because the module keeps a marker per voided sale. What comes back is read from
  this module's own movement ledger, so it is exactly what left: a decrease that was rejected for
  insufficient stock gives nothing back, because nothing was ever taken out.

Service lines and lines without a product are skipped in both directions.

## When something looks wrong

**"I sold something and the stock did not move."** Check, in this order: is **Track stock** on? Is
the product `physical` and not a `service`? Does the sale line actually carry a product (a free-price
line does not)? Is `sales` installed? If what you sold was a **menu or a pack**, look at its
components: they are the ones that move, and one of them may have *Track stock* switched off.

**"The stock went negative."** **Allow selling without stock** is on. That is the setting working as
designed. Turn it off if you want sales blocked instead.

**"The inventory value looks too low."** It is valued **at cost**, not at sale price. Products with a
cost of zero contribute nothing, services never contribute, and negative stock does not subtract.

**"A product does not appear in the POS."** It must be active, and to appear grouped it must be
linked to a category. Check both.

**"The low-stock list is wrong."** Services are excluded on purpose. A product uses its own threshold
if it has one, otherwise the global threshold from Settings.

**"I voided a sale and stock did not come back."** If the sale was made while **Track stock** was
off, nothing was ever taken out, so nothing is given back. That is recorded deliberately.

**"I need to fix a wrong balance."** Do a stock count with the real counted value and a reason. Never
try to compensate with a fake reception or a fake sale — the ledger is what an inspection reads.
