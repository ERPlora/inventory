-- Métricas de inventario del hub (dashboard, inventory#9). Contrato:
--   * `total_inventory_value` — valoración BÁSICA A COSTE, en céntimos (frontera
--     ADR-0135/#9: FIFO/coste medio/por-almacén = warehouse, no aquí). Fórmula:
--     Σ (cost × stock) de productos FÍSICOS activos con stock > 0 — los servicios
--     no valoran y un stock negativo (sobreventa, inventory#6) no RESTA valor.
--     OJO a la ESCALA (ADR-0147): `cost` va en céntimos y `stock` en punto fijo 10⁶, así que
--     el producto de los dos hay que dividirlo por 10⁶ para volver a céntimos. Sin esa
--     división el inventario valía un MILLÓN de veces de más — es el precio de mezclar dos
--     magnitudes: la aritmética de cantidades no sabe de escala, pero cantidad × dinero SÍ.
--   * `products_without_cost` — físicos que valoran a 0 por no tener coste
--     registrado; la UI muestra esa limitación en vez de callarla.
--   * Contadores de existencias (seguidos/en stock/agotados/bajo umbral) SOLO
--     sobre físicos activos QUE CONTROLAN STOCK (inventory#48: flag por artículo, NULL = hereda el
--     hub): un servicio no tiene existencias, y un artículo sin control tampoco tiene un saldo
--     que contar. `products_without_cost` y la valoración también van sobre los que controlan.
--   * `total_products` — el catálogo activo entero (servicios y no controlados incluidos).
-- Portable SQLite+Postgres (CASE WHEN, sin funciones dialectales).
SELECT
  COUNT(*)                                                                    AS total_products,
  COALESCE(SUM(CASE WHEN t.tracked = 1 THEN 1 ELSE 0 END), 0)                 AS products_tracked,
  COALESCE(SUM(CASE WHEN t.tracked = 1 AND stock > 0
                    THEN 1 ELSE 0 END), 0)                                    AS products_in_stock,
  COALESCE(SUM(CASE WHEN t.tracked = 1 AND stock <= 0
                    THEN 1 ELSE 0 END), 0)                                    AS products_out_of_stock,
  COALESCE(SUM(CASE WHEN t.tracked = 1 AND stock <= low_stock_threshold
                    THEN 1 ELSE 0 END), 0)                                    AS products_low_stock,
  COALESCE(SUM(CASE WHEN t.tracked = 1 AND cost <= 0
                    THEN 1 ELSE 0 END), 0)                                    AS products_without_cost,
  COALESCE(SUM(CASE WHEN t.tracked = 1 AND stock > 0
                    THEN cost * stock / 1000000 ELSE 0 END), 0)               AS total_inventory_value
FROM (
  SELECT p.*,
         CASE WHEN p.product_type = 'service' THEN 0
              ELSE COALESCE(p.track_stock,
                            (SELECT s.track_stock FROM inventory_settings s
                             WHERE s.hub_id = :hub_id AND s.is_deleted = 0), 1)
         END AS tracked
  FROM inventory_product p
  WHERE p.hub_id = :hub_id AND p.is_deleted = 0 AND p.is_active = 1
) t;
