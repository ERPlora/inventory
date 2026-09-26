-- inventory#106: the categories ticked when CREATING a product are never saved — only the edit
-- branch (`inventory.products.add_category`) linked them. This statement runs right after
-- commands/product_create.sql, in the same transaction, and reuses `:new_id` (the same id the
-- runtime injected for the INSERT above) to link the chosen categories to the just-created product.
-- `inventory_product_categories` is a pure join table with NO `hub_id` column (see
-- product_add_category.sql), so the tenant guard lives in this SELECT: `c.hub_id = :hub_id` means
-- a category id from another hub is silently never linked, not an error.
-- `:category_ids` is an optional JSON array; the runtime binds it as its JSON text (not as an
-- array type), hence CAST(... AS jsonb) + jsonb_array_elements_text to unpack it. Absent/null
-- input falls back to CAST('[]' AS jsonb), so no `category_ids` in the payload means no links.
-- A repeated id links once: `IN (subquery)` is a semi-join. Soft-deleted categories (`is_deleted = 1`)
-- are filtered out, same as the edit path.
-- No `::` cast syntax here on purpose: this module's psql test batteries bind `:name` with a
-- regex that would also match the `::type` cast operator.
INSERT INTO inventory_product_categories (product_id, category_id)
SELECT :new_id, c.id
  FROM inventory_category c
 WHERE c.hub_id = :hub_id
   AND c.is_deleted = 0
   AND c.id IN (SELECT jsonb_array_elements_text(COALESCE(CAST(:category_ids AS jsonb), CAST('[]' AS jsonb))));
