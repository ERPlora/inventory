-- Edición de producto (inventory#8): la UI envía el conjunto COMPLETO de campos
-- editables (el schema los exige — un caller que omita uno falla alto, nunca borra
-- en silencio). El stock NO se toca aquí: es autoridad del ledger (#7, recuento y
-- recepción); el SKU es identidad (no editable). tax_category_key = ADR-0085.
-- Las tres columnas de unidad (ADR-0147) van con COALESCE y NO como reemplazo: la unidad
-- maestra es ADITIVA/opcional a propósito — cambiarla es un acto explícito (enviar el campo),
-- y un caller pre-0147 que no la conozca no debe borrarla en silencio al editar el producto.
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
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :product_id AND hub_id = :hub_id AND is_deleted = 0;
