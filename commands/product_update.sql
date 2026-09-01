-- Edición de producto (inventory#8): la UI envía el conjunto COMPLETO de campos
-- editables (el schema los exige — un caller que omita uno falla alto, nunca borra
-- en silencio). El stock NO se toca aquí: es autoridad del ledger (#7, recuento y
-- recepción); el SKU es identidad (no editable). tax_category_key = ADR-0085.
-- Las tres columnas de unidad (ADR-0147) van con COALESCE y NO como reemplazo: la unidad
-- maestra es ADITIVA/opcional a propósito — cambiarla es un acto explícito (enviar el campo),
-- y un caller pre-0147 que no la conozca no debe borrarla en silencio al editar el producto.
-- `track_stock` (inventory#48) sigue la misma regla: COALESCE, opcional — ausente = se conserva
-- (un caller que no conozca el flag no lo pisa). Se fija con 1/0; volver a NULL («sigue al hub»)
-- no está expuesto por este command, igual que en ADR-0210 no se «des-resuelve» una lista.
-- 🔴 `CAST(:track_stock AS BIGINT)`, never `AS INTEGER`: the tri-state binds the same slot as NULL
-- and as an integer, and int4 vs the runtime's i64 breaks on any kernel that caches the prepared
-- statement (ERPlora/hub#1348, fixed in develop by hub#1386; this keeps hubs on an older IMAGE
-- working — the whole reasoning is in `commands/product_create.sql`).
UPDATE inventory_product SET
  name = :name,
  price = :price,
  cost = :cost,
  low_stock_threshold = :low_stock_threshold,
  ean13 = :ean13,
  description = :description,
  tax_category_key = :tax_category_key,
  is_active = :is_active,
  unit_code = COALESCE(:unit_code, unit_code),
  pricing_unit_code = COALESCE(:pricing_unit_code, pricing_unit_code),
  price_quantity_value = COALESCE(:price_quantity_value, price_quantity_value),
  track_stock = COALESCE(CAST(:track_stock AS BIGINT), track_stock),
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :product_id AND hub_id = :hub_id AND is_deleted = 0;
