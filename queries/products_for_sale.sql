-- CATÁLOGO DE VENTA: lo que el servidor necesita para no fiarse del navegador (sales#68).
-- Runtime inyecta :hub_id.
--
-- Existe porque `sales.complete_sale` tomaba el `price` de cada línea DEL PAYLOAD: lo único que
-- comprobaba era que no fuese negativo, así que un artículo de 50 € se podía vender por un céntimo
-- y el hub lo aceptaba entero —descontaba stock, apuntaba caja y emitía factura—. La vía para
-- arreglarlo ya estaba inventada en ese mismo handler (el método de pago se contrasta contra su
-- catálogo pre-cargado); lo que faltaba era un catálogo de productos que `sales` pudiera leer.
--
-- ⚠️ SIN bloque `list` A PROPÓSITO. Una `read` de ADR-0069 sobre una query paginada entrega **solo
-- la primera página** y el handler no se entera (hub#650). Con `inventory.products.list`
-- (`page_size: 50`) un blueprint de restaurante —280 productos— habría dejado fuera a 230, y cada
-- venta de esos habría sido rechazada por «producto desconocido». Aquí no hay página: o está el
-- catálogo entero, o no está.
--
-- Filas ESTRECHAS a propósito: esto se pre-carga en CADA venta, así que solo van las columnas que
-- deciden algo en el servidor. Nada de descripción, imagen ni stock.
--
-- sales#288 — `name` y `sku` decidieron algo: el NOMBRE que congela la línea lo escribe el SERVIDOR,
-- con la misma regla que el precio (si la línea dice venir del catálogo, manda el catálogo). Sin
-- estas dos columnas `sales` no tiene de dónde escribirlo, y una línea añadida por la API con solo
-- el `product_id` llegaba a la pantalla de cocina sin nombre: el pase imprimía el UUID crudo.
-- Son DISPLAY, no dinero — no se valida nada contra ellas—, y por eso su ausencia degrada (un hub
-- con `inventory` anterior a este cambio sigue escribiendo el texto que mande el llamante) en vez
-- de rechazar la venta, que es lo que hace la falta del catálogo entero.
--
-- `track_stock` (inventory#48) es el valor EFECTIVO por artículo — el propio, o el del hub si es
-- NULL (tri-estado ADR-0210); un servicio nunca controla. El TPV lo usa para saber que ese artículo
-- no tiene disponibilidad que mostrar, y `decrease_on_sale` para saltar la línea sin descuento.
--
-- Solo productos activos y no borrados: vender uno desactivado es una decisión de negocio que el
-- TPV no debería poder tomar por su cuenta.
SELECT id,
       name,                    -- lo que lee la persona: el pase, el tique y el KDS (sales#288)
       sku,                     -- la referencia del artículo, congelada con el nombre
       price,                   -- unidades mínimas (ADR-0007/0123)
       cost,                    -- unidades mínimas
       tax_category_key,        -- con qué regla tributa (ADR-0085)
       unit_code,               -- unidad de medida (ADR-0147)
       pricing_unit_code,       -- unidad en la que se expresa el precio
       price_quantity_value,    -- «0,37 € por 100 ud»: la cantidad de precio
       CASE WHEN product_type = 'service' THEN 0
            ELSE COALESCE(track_stock,
                          (SELECT s.track_stock FROM inventory_settings s
                           WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 1)
       END AS track_stock       -- control de stock EFECTIVO por artículo (inventory#48)
FROM inventory_product
WHERE hub_id = :hub_id
  AND is_deleted = 0
  AND is_active = 1;
