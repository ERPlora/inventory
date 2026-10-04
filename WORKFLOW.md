# WORKFLOW — Inventario

Prefijo: INVENTORY
Alcance MVP: transversal

> Contrato de comportamiento del módulo (pm#620, pm#621). Se lee antes de tocar el código y se
> actualiza en la misma PR que cambie un comportamiento. El detalle técnico vive en
> `architecture/modules/inventory.md`; aquí se escribe lo que ve y hace la persona. Contrastado
> contra `origin/main` v1.2.74 (05/10/2026).

## Para qué sirve y para quién

Inventario es el catálogo de lo que se vende con existencias: cada producto con su nombre, su SKU,
su precio, su coste, su categoría fiscal, su unidad de medida y cuántas unidades quedan. En el
restaurante es **la carta** (los platos y las bebidas que el TPV enseña agrupados por categoría y que
Cocina enruta a su estación); en la peluquería son **los productos de venta** (champú, cera, tinte
de reventa), porque los servicios viven en Servicios. Cada cambio de stock —recepción, venta,
anulación, recuento— deja un movimiento que no se puede editar ni borrar, y el saldo se explica por
ellos.

Lo usan el **administrador** y el **responsable** (dan de alta y cambian productos y categorías,
importan el catálogo, reciben mercancía y cuentan stock; los ajustes del módulo solo los guarda el
administrador en pantalla) y el **empleado** y el **cajero** (solo consultan productos, categorías y
movimientos). Las ventas no se hacen aquí: el stock baja solo cuando Ventas cobra. Inventario **no
es obligatorio para vender**: sin él, el TPV cobra servicios y líneas a precio libre.

## Referencia adoptada

La referencia de mercado del restaurante ya está contrastada en
`.claude/agents/qa-hub-restaurant.md` §2 (10/08/2026); de ella se adopta la carta por categorías, el
control de stock por artículo y el recuento con motivo
([Lightspeed — Practice run checklist](https://resto-support.lightspeedhq.com/hc/en-us/article_attachments/360044738513)),
no el «agotado/86» ni la cantidad restante en el TPV
([Square — disponibilidad](https://squareup.com/help/us/en/article/8495-beta-item-availability)),
que no existen aquí. Lo demás sale de las decisiones de mercado ya registradas en
`architecture/modules/inventory.md`:

- **Control de stock por artículo, con valor por defecto del negocio** (sales#25, inventory#48):
  Square «Track stock», Odoo «Track Inventory», Business Central, Shopify «Track quantity»,
  WooCommerce «Manage stock?».
- **Importar con mapeo de columnas, ensayo e informe antes de crear nada** (inventory#13): el
  «Test import» de Odoo, el mapeo con columnas obligatorias de WooCommerce y Lightspeed y el resumen
  de Shopify.
- **Borrar una categoría desvincula sus artículos, no los borra ni bloquea** (inventory#8,
  19/08/2026): Shopify, WooCommerce, Square, Lightspeed, Toast y Vagaro.
- **Un menú o un pack mueve el stock de sus componentes, nunca el suyo** (ADR-0381, inventory#69):
  el kit de Odoo, Shopify Bundles, WooCommerce Product Bundles, Square.
- **Libro de movimientos inmutable y recuento absoluto con motivo** (inventory#7, ADR-0135);
  **cantidades exactas con escalón por unidad** (ADR-0147, fracciones exactas como SAP).
- La categoría fiscal se elige por su tipo («Producto — general · 21 %»), como Square, Lightspeed,
  Odoo y Holded (inventory#58).

## Antes de empezar

- **Impuestos** se instala con Inventario y no se puede quitar mientras esté: cada producto apunta a
  una categoría fiscal suya. De fábrica trae las categorías de España (TAXES-F16).
- **Ventas** no depende de Inventario. Con los dos instalados, el TPV vende desde este catálogo y la
  venta baja el stock (INVENTORY-F21). **Cocina** sí lo declara como dependencia: enruta por producto
  y por categoría.
- **Impresión**, para la etiqueta del código de barras: una impresora con la función «Etiqueta»
  (INVENTORY-F25).
- Al instalarlo, el hub siembra las unidades de medida (unidad, kilo, gramo, tonelada, litro,
  mililitro, minuto y hora) y la lista «Termina de configurar tu negocio» pide el primer producto
  (INVENTORY-F28).

Configuración inicial, paso a paso:

1. En **Inventario → Ajustes** (solo el administrador guarda), decide «Controlar stock» y «Permitir
   vender sin stock» (INVENTORY-F19). Lee antes lo que hace de verdad cada uno.
2. Carga la carta o el catálogo: con la plantilla del sector (INVENTORY-F12), con un CSV
   (INVENTORY-F09) o a mano (INVENTORY-F01).
3. Crea las categorías que agrupan la carta en el TPV (INVENTORY-F06) y asígnalas (INVENTORY-F08).
4. Revisa que ningún producto sale «Sin configurar» (INVENTORY-F05).
5. Da el stock de partida con «Contar stock» (INVENTORY-F14), mejor que con «Stock inicial»: el recuento
   deja movimiento y el alta no.
6. Haz una venta de prueba y comprueba en **Movimientos** que el stock bajó (INVENTORY-F21).

## Pantallas

El módulo se abre desde el menú **Inventario** y tiene cuatro pestañas: **Panel**, **Productos**,
**Movimientos** y **Categorías**, más la pestaña **Ajustes** que añade el hub. Ninguna pestaña
declara permiso: todas se ven, y lo que no se puede hacer no aparece o falla al cargar. El servidor
exige el permiso de cada acción aunque la pantalla enseñe el botón.

### Panel
Cifras de arriba (cada una lleva a Productos, salvo el valor): «Productos seguidos», «En stock»,
«Agotados», «Stock bajo» y «Valor de existencias» («a coste»). Si hay artículos con stock sin coste,
la nota «N producto(s) sin coste registrado: el valor mostrado es parcial». Debajo, la tabla
«Productos con stock bajo» (Nombre, SKU, Stock, Umbral), 5 por página. Vacía: «Sin productos en stock
bajo.». Cargando: «Cargando…». Error: «No se pudieron cargar las métricas del inventario.» y el aviso
de la tabla con reintento.

### Productos
Tabla con Nombre, SKU, Precio, Stock (con «—» en un artículo sin control de stock) y Estado (un
interruptor activo/inactivo, «Sí»/«No» sin permiso de cambio, o la marca «Sin configurar · Falta la
categoría fiscal»). Buscador «Buscar producto…» por nombre o SKU, orden por columna, filtros por
nombre, SKU, precio desde/hasta, stock desde/hasta y estado («Sí», «No», «Sin configurar»), 50 por
página, vista tabla o tarjetas. Botones de la tabla: **+** (con permiso de alta), importar y exportar
CSV (con sus permisos). Por fila: «Detalles», «Recibir stock», «Contar stock» (con permiso de stock),
«Editar» y «Eliminar»; tocar la fila abre la ficha. El **+** y «Editar» abren el panel lateral del
formulario: Nombre, SKU (bloqueado al editar, «El SKU es la identidad del producto: no se edita»),
Precio, «Coste (EUR)», «Stock inicial» (solo al crear), «Umbral stock bajo», «EAN-13», «Descripción»,
«Tipo» («Físico» o «Servicio», solo al crear), la casilla «Controlar stock de este artículo» con su
nota, «Unidad de medida», «Categoría fiscal» («Elige una categoría fiscal») y «Categorías» (si hay
alguna), y «Guardar» / «Guardar cambios» («Guardando…»). Vacía: «Sin productos». Cargando:
«Cargando…». Error: el aviso de la tabla con reintento; un rechazo del formulario sale dentro del
panel, y el de una acción de fila, encima de la tabla.

### Ficha del producto
Ventana con el nombre del producto: SKU, Precio, Stock y Estado; el código de barras del SKU en una
placa blanca con el SKU debajo; «Imprimir código de barras» y, con permiso de stock, «Recibir stock»
y «Contar stock». Un fallo de impresión sale dentro de la ventana.

### Recepción
Ventana «Recepción — <producto>»: «Stock actual», «Cantidad recibida», «Coste unitario (EUR)» y
«Registrar recepción». Un rechazo sale dentro de la ventana.

### Recuento
Ventana «Recuento — <producto>»: «Stock actual», «Diferencia» (en cuanto hay cifra), «Stock contado»,
«Motivo (obligatorio)» y «Aplicar recuento», con la nota de lo que falta («Escribe el stock contado
para continuar.» / «Hace falta un motivo para aplicar el recuento.»). Un rechazo sale dentro.

### Importar productos
Tres ventanas seguidas. «Revisa la importación»: un desplegable por columna del fichero («No
importar» o el campo; Nombre y SKU llevan asterisco), «Primeras {n} filas de {total}», el resumen
«{ready} fila(s) listas · {failed} con problemas» con hasta 10 motivos, e «Importar {n} producto(s)» y
«Cancelar». Si hace falta, «Categorías fiscales del CSV»: un bloque por texto no reconocido (o «Filas
sin categoría fiscal») con «Elegir» / «Crear» / «Omitir» y «Confirmar e importar». Mientras corre,
encima de la tabla: «Importando {done}/{total}…» con «Parar». Al final, «Resultado de la importación»:
«Filas», «Creadas», «Omitidas (ya existían)», «Fallidas», una línea por fila fallida («Línea N · SKU —
motivo») y «Copiar informe».

### Movimientos
Tabla de solo lectura: Fecha, Nombre, SKU, Tipo («Inicial», «Recepción», «Venta», «Anulación»,
«Recuento», «Descuento»), Cantidad (con signo), Saldo, Motivo y Referencia (en una venta, el número
del tique, la factura o la venta). Buscador por producto, SKU, referencia o número de tique; filtros
por Tipo y por Referencia; más recientes primero; 50 por página. Vacía: «Todavía no hay movimientos.
Aparecen al usar Recibir stock o Contar stock en un producto de Productos, y con cada venta.». Sin
coincidencias: «Ningún movimiento coincide con la búsqueda o los filtros. Una venta se encuentra por el
número de su tique, factura o venta.». Error: el aviso de la tabla con reintento.

### Categorías
Tabla con Nombre, Slug y Productos (cuántos activos tiene), buscador «Buscar categoría…», 25 por
página, importar y exportar CSV. **+** y la fila (o «Editar») abren el panel: Nombre, «Slug
(opcional)», «Tipo de IVA / Impuesto» («— (por defecto)» o una categoría fiscal), «Cancelar edición» y
«Guardar» / «Guardar cambios». «Eliminar» abre «Eliminar categoría» con el impacto y «Eliminar y
desvincular» / «Cancelar». Vacía: «Sin categorías.». Cargando: «Cargando…».

### Ajustes
Pestaña «Ajustes» que añade el hub, con la cabecera «Inventario»: «Permitir vender sin stock», «Umbral
de stock bajo» (con su explicación) y «Controlar stock», y «Guardar». Solo guarda el administrador; al
resto le sale «Solo un administrador puede cambiar estos ajustes.». Cargando: «Cargando ajustes…».
Error: «No se pudieron cargar los ajustes.».

## Flujos

El detalle de cada flujo vive en `workflow/`, con la misma gramática y el mismo prefijo. El porqué
de cada hueco (`parcial`, `no hecho`) está en su línea `Estado:`.

| ID | Flujo | Vertical | Estado | Fichero |
|---|---|---|---|---|
| INVENTORY-F01 | Dar de alta un producto | comun | parcial | [workflow/catalogo.md](workflow/catalogo.md) |
| INVENTORY-F02 | Editar un producto | comun | parcial | [workflow/catalogo.md](workflow/catalogo.md) |
| INVENTORY-F03 | Activar y desactivar un producto | comun | hecho | [workflow/catalogo.md](workflow/catalogo.md) |
| INVENTORY-F04 | Eliminar un producto | comun | hecho | [workflow/catalogo.md](workflow/catalogo.md) |
| INVENTORY-F05 | Revisar los productos que no se pueden vender por falta de IVA | comun | hecho | [workflow/catalogo.md](workflow/catalogo.md) |
| INVENTORY-F06 | Crear y editar una categoría | comun | parcial | [workflow/catalogo.md](workflow/catalogo.md) |
| INVENTORY-F07 | Eliminar una categoría | comun | hecho | [workflow/catalogo.md](workflow/catalogo.md) |
| INVENTORY-F08 | Agrupar productos en categorías para el TPV | comun | parcial | [workflow/catalogo.md](workflow/catalogo.md) |
| INVENTORY-F09 | Importar productos desde un CSV | comun | parcial | [workflow/importar-y-exportar.md](workflow/importar-y-exportar.md) |
| INVENTORY-F10 | Importar categorías desde un CSV | comun | parcial | [workflow/importar-y-exportar.md](workflow/importar-y-exportar.md) |
| INVENTORY-F11 | Exportar el catálogo a CSV | comun | parcial | [workflow/importar-y-exportar.md](workflow/importar-y-exportar.md) |
| INVENTORY-F12 | Cargar la carta de una plantilla del sector | comun | hecho | [workflow/importar-y-exportar.md](workflow/importar-y-exportar.md) |
| INVENTORY-F13 | Recibir mercancía | comun | parcial | [workflow/stock.md](workflow/stock.md) |
| INVENTORY-F14 | Contar el stock de un producto | comun | parcial | [workflow/stock.md](workflow/stock.md) |
| INVENTORY-F15 | Dar de baja stock sin venta (merma, rotura, consumo propio) | comun | parcial | [workflow/stock.md](workflow/stock.md) |
| INVENTORY-F16 | Consultar el historial de movimientos | comun | parcial | [workflow/stock.md](workflow/stock.md) |
| INVENTORY-F17 | Ver el panel y los productos con stock bajo | comun | hecho | [workflow/stock.md](workflow/stock.md) |
| INVENTORY-F18 | Avisar cuando un artículo cruza su mínimo | comun | parcial | [workflow/stock.md](workflow/stock.md) |
| INVENTORY-F19 | Ajustar el inventario | comun | parcial | [workflow/stock.md](workflow/stock.md) |
| INVENTORY-F20 | Decidir qué artículos llevan control de stock | comun | hecho | [workflow/stock.md](workflow/stock.md) |
| INVENTORY-F21 | Bajar el stock al cobrarse una venta | comun | parcial | [workflow/con-otros-modulos.md](workflow/con-otros-modulos.md) |
| INVENTORY-F22 | Bajar el stock de los componentes de un menú o un pack | comun | hecho | [workflow/con-otros-modulos.md](workflow/con-otros-modulos.md) |
| INVENTORY-F23 | Reponer el stock al anularse una venta | comun | hecho | [workflow/con-otros-modulos.md](workflow/con-otros-modulos.md) |
| INVENTORY-F24 | Reponer el stock de una devolución | comun | no hecho | [workflow/con-otros-modulos.md](workflow/con-otros-modulos.md) |
| INVENTORY-F25 | Imprimir la etiqueta del código de barras | comun | parcial | [workflow/con-otros-modulos.md](workflow/con-otros-modulos.md) |
| INVENTORY-F26 | Vender al peso o por medida: unidades y escalón | comun | parcial | [workflow/con-otros-modulos.md](workflow/con-otros-modulos.md) |
| INVENTORY-F27 | Entregar el catálogo al TPV, a Cocina y a Menús | comun | hecho | [workflow/con-otros-modulos.md](workflow/con-otros-modulos.md) |
| INVENTORY-F28 | Completar el primer paso «Tu catálogo» | comun | hecho | [workflow/con-otros-modulos.md](workflow/con-otros-modulos.md) |

## Qué comparten los verticales

Todos los flujos son `comun`: el restaurante usa Inventario para la carta y la peluquería para los
productos de venta, con las mismas pantallas, los mismos ajustes y la misma reacción a la venta. No hay
ajuste por vertical. Tocar una pieza de esta tabla afecta a los dos negocios.

| Pieza compartida | Flujos que la usan |
|---|---|
| El formulario del producto (mismo panel para alta y edición; categoría fiscal obligatoria, sin opción por defecto) | F01, F02, F05, F08, F20, F26 |
| El selector de categoría fiscal con nombre y tipo («· 21 %», «exento»), leído de Impuestos | F01, F02, F06, F09 |
| El control de stock efectivo: el del artículo, o el del negocio si el artículo no lo fijó; un servicio nunca | F17, F18, F19, F20, F21, F22 |
| El guardián del descuento de stock (una sola sentencia que mueve saldo y apunte; con «Permitir vender sin stock» apagado, no baja si no alcanza) | F15, F21, F22 |
| El libro de movimientos (inmutable; el saldo se explica por él; la anulación devuelve lo que él dice) | F13, F14, F15, F16, F21, F22, F23 |
| El umbral de stock bajo de cada producto y el cruce con histéresis | F13, F14, F15, F17, F18, F21 |
| La unidad de medida y su escalón | F01, F02, F09, F13, F14, F15, F26 |
| El catálogo de venta que leen Ventas, Cocina y Menús (solo productos activos y no borrados; categorías activas) | F03, F04, F08, F27 |
| La lectura de alias y categorías fiscales de Impuestos al importar | F09, F10 |

## Cobertura contra la referencia

| Elemento de la referencia | Estado | Flujo |
|---|---|---|
| Ficha con nombre, SKU, precio, coste, categoría fiscal, código de barras y unidad | hecho | F01, F02 |
| Foto del artículo en la ficha | no hecho: no hay campo; solo entra por el asistente, la API o una plantilla | F01 |
| Precio por una cantidad distinta de la unidad (por 100 g, por kg con stock en g) | parcial: solo por el asistente o la API | F01, F26 |
| Categoría fiscal obligatoria al guardar | parcial: obligatoria sí; que exista en Impuestos solo lo garantiza la pantalla | F01, F02 |
| Activar y desactivar sin borrar | hecho | F03 |
| Borrado con historial conservado y código liberado | hecho | F04 |
| Categorías con orden, color e icono para la carta | parcial: nombre y slug en pantalla; el TPV las ordena por nombre | F06, F08 |
| Borrar categoría desvincula | hecho | F07 |
| Importar CSV con mapeo, ensayo e informe | hecho | F09 |
| CSV con punto y coma (el de Excel en español) | no hecho: solo se separa por comas | F09 |
| Actualizar precios de productos existentes por CSV | no hecho: un SKU que ya existe se omite | F09 |
| Exportar el catálogo entero | parcial: solo la página que se ve, con cifras internas | F11 |
| Control de stock por artículo con valor por defecto del negocio | hecho | F20 |
| Recepción de mercancía con coste | parcial: una línea por producto y sin número de albarán en pantalla | F13 |
| Recuento absoluto con motivo | hecho | F14 |
| Merma, rotura o consumo propio con motivo | parcial: solo por el asistente o la API | F15 |
| Historial de movimientos con quién y cuándo | parcial: no enseña quién; sin filtro de fecha ni de producto en pantalla | F16 |
| Alerta de stock bajo | parcial: panel, paneles del inicio y un aviso para Flujos; sin notificación | F17, F18 |
| No vender lo que no hay, o vender en negativo, según el ajuste | parcial: el TPV no lo bloquea; apagado, la venta no baja nada | F19, F21 |
| Agotado / 86 y cantidad restante en el TPV | no hecho | F27 |
| La venta baja el stock, una sola vez | hecho | F21 |
| Menú o pack baja sus componentes | hecho | F22 |
| La anulación repone exactamente lo que salió | hecho | F23 |
| La devolución repone el stock | no hecho: no escucha la devolución | F24 |
| Etiqueta de código de barras con nombre y precio | parcial: por la cola del hub sale una sola vez por producto y sin aviso si nadie la imprime | F25 |
| Lectura del código de barras en el TPV | no hecho: el TPV no busca por EAN-13 y la etiqueta lleva el SKU | F25, F27 |
| Venta al peso con báscula | no hecho: nada lee la báscula (SALES-F10) | F26 |
| Varios almacenes y traspasos | no hecho, a propósito (futuro módulo `warehouse`) | — |
| Recetas o escandallos que bajan ingredientes | no hecho, a propósito (fuera del MVP) | — |
| Variantes (talla, tamaño) con stock propio | no hecho: la tabla existe, ninguna pantalla ni orden la usa | — |

## Datos: de quién es cada dato

- **Propios**: productos (con su unidad, su umbral, su control de stock y su categoría fiscal
  guardada como clave), categorías de producto y su relación con los productos, el libro de
  movimientos, la ubicación única «General», las unidades de medida, los ajustes del módulo (uno por
  negocio) y la marca de «venta ya repuesta». La tabla de variantes existe y ninguna orden la escribe.
- **Lee de otros**: las categorías fiscales, sus tipos y los alias, de Impuestos, por sus consultas
  públicas (para el selector y para importar); al importar también crea categorías y alias en
  Impuestos con sus órdenes públicas. En Movimientos, el número de la venta (Ventas) y el de su tique o
  factura (Facturación), solo para pintarlo. De las ventas recibe el aviso de venta cobrada (líneas,
  cantidades, componentes) y el de venta anulada (la venta).
- **Lo leen otros** por consultas públicas: Ventas (el catálogo de venta, el de la rejilla, las
  categorías, el mapa producto–categoría y las unidades), Cocina (productos y categorías para el
  enrutado), Menús (los productos que pueden ser componente) y el hub (las cifras de los paneles del
  inicio y el primer paso de la configuración). Nadie toca sus tablas.
- **Datos personales** (inventario RGPD, recorrido por las 10 migraciones): no guarda clientes. Sí
  guarda, en todas las tablas, quién creó y quién cambió cada fila; en el libro, quién hizo cada
  movimiento y el **motivo** libre de recuentos y bajas (puede llevar un nombre); en productos y
  categorías, la **descripción** libre. La referencia de un movimiento de venta es el identificador de
  la venta. Los avisos que declaran las órdenes (alta, cambio y borrado de producto, enlaces con
  categorías, recuento) llevan los datos de la orden, quién la lanzó y la identidad fiscal del negocio
  (NIF, nombre y dirección, que en un autónomo es dato personal), porque el hub copia todo eso en el
  aviso (leído en el hub, sin ejecutar); el de cruce de mínimo lleva producto, cantidades y la venta o
  el albarán. No hay borrado RGPD
  propio.

## Reglas que no se rompen

Solo las que hace cumplir el servidor, por cualquier puerta (pantalla, asistente, API). Lo que solo
impide la pantalla está como hueco en su flujo.

- **Aislamiento**: toda lectura y escritura lleva el negocio; un enlace producto–categoría solo se
  hace si los dos son del mismo negocio.
- **SKU y EAN-13 únicos entre los productos vivos** del negocio; un producto borrado libera los dos.
- **Un producto no se guarda sin categoría fiscal** (no vacía), al crear, editar o crear en bloque.
  Que la categoría exista en Impuestos no lo comprueba el servidor (F01).
- **Dinero**: precio y coste en la unidad mínima de la moneda, enteros y no negativos.
- **Cantidades**: enteros exactos (millonésimas); la base de datos rechaza escribir un stock, un
  umbral o un movimiento más fino que una milésima de unidad. El descuento directo rechaza una cantidad fuera del escalón de la unidad del
  producto («Esa cantidad no encaja en la unidad del producto…»); el recuento y la recepción lo
  comprueban solo en pantalla.
- **El stock no se edita en la ficha**: solo lo mueven la recepción, el recuento, el descuento, la
  venta y la anulación. El SKU tampoco se edita.
- **Recuento**: valor absoluto, nunca negativo, con motivo de 3 a 500 caracteres.
- **El libro no se edita ni se borra**: no hay orden para ello. Saldo y apunte de una venta o un
  descuento se escriben en una sola sentencia: no hay apunte sin bajada ni bajada sin apunte.
- **Sin «Permitir vender sin stock», el saldo nunca queda en negativo** por una venta o un descuento: si
  no alcanza, no baja nada (y el descuento directo lo rechaza con «No hay stock suficiente para
  completar la operación.»).
- **Un servicio no baja ni se cuenta**; un artículo sin control de stock no baja por una venta.
- **La anulación repone una sola vez y solo lo que salió**, leído del propio libro.
- **Permisos**: ver productos, categorías y movimientos (empleado, cajero, responsable,
  administrador); crear, cambiar, borrar, importar, exportar, recibir y contar (responsable,
  administrador); los ajustes, la orden los acepta del responsable, pero la pestaña solo deja guardar
  al administrador.
- **Borrado lógico**: un producto o una categoría borrados no desaparecen de la base de datos, y sus
  movimientos se conservan.

## Lo que NO hace, a propósito

- No gestiona almacenes, ubicaciones, traspasos, lotes, caducidades ni valoración FIFO o media: es de un
  futuro módulo `warehouse` (ADR-0135). Hay una sola ubicación lógica, «General».
- No hace recetas ni escandallos: un plato no baja sus ingredientes; un suplemento nunca mueve stock.
- No calcula impuestos: solo guarda la clave de la categoría fiscal (Impuestos).
- No pone el precio de una venta ni cobra: lo hace Ventas con el precio de este catálogo.
- No vende servicios con agenda: los servicios de la peluquería viven en Servicios.
- No gestiona variantes, aunque la tabla exista.
- No imprime por sí mismo: entrega la etiqueta a la puerta de impresión del hub.

## Dudas abiertas

Se resuelven con `market-decision`; no las decide el worker.

1. Con «Permitir vender sin stock» apagado (el de fábrica), una venta que supera el saldo se cobra y el
   stock no baja nada, sin aviso (F21). ¿Debe el TPV avisar o impedir la venta, o la venta debe bajar a
   negativo igualmente y el ajuste solo gobernar el aviso?
2. ¿La devolución de una venta debe reponer stock, con una casilla «devolver al stock» por línea como
   Square y Toast (F24, SALES-F31)?
3. ¿Hace falta una pantalla de baja con motivo (merma, rotura, consumo propio) o basta el recuento
   (F15)?
4. El «Tipo de IVA / Impuesto» de una categoría no lo usa nadie (F06): ¿se quita, o los productos de la
   categoría deben heredarlo?
5. «Umbral de stock bajo» de Ajustes solo lo hereda un producto creado por el asistente o la API (F19):
   ¿debe el formulario dejar el campo vacío para heredarlo, y debe un cambio del ajuste alcanzar a los
   productos que lo heredaron?
6. ¿Entra en el MVP la foto del artículo en la ficha y el orden de las categorías en el TPV (F01, F06)?
7. ¿Debe la etiqueta salir otra vez cada vez que se pulsa, también por la cola del hub (F25)?

## Fuentes contrastadas

Contra `origin/main` v1.2.74 (05/10/2026). Una línea por discrepancia; manda el código.

- **`docs/overview.md`, `docs/limits.md` y el documento técnico**: «the hub refuses to save a product pointing at a tax category that does not exist»; el bloque que lo describía está retirado en el hub y no se ejecuta (hub#610): el servidor acepta cualquier clave no vacía (F01). **TAXES-F19** dice lo mismo («Inventario comprueba que la categoría de un producto existe antes de guardarlo»).
- **`docs/concepts.md`** («Leave it empty and the product falls back to the hub's default category») y **`docs/limits.md`** («leave the field empty to use the hub default»): la categoría fiscal es obligatoria y no hay categoría por defecto (F01).
- **`docs/concepts.md`, `docs/limits.md` y el manual** («off — the decrease is rejected»; «Mantenga desactivada Permitir vender sin stock si quiere bloquear una venta insuficiente»): solo el descuento directo se rechaza; la venta se cobra igual y su stock no baja (F21). **QA `qa-hub-restaurant` §7.03** espera «negativo permitido/no permitido según ajuste».
- **`docs/overview.md` y `docs/concepts.md`** («every change of stock … is written to an immutable movement ledger»): el «Stock inicial» del alta, la importación CSV y la plantilla dejan saldo sin movimiento; «Inicial» solo lo tienen los productos que ya existían cuando llegó el libro (F01, F09, F12).
- **`docs/screens.md`**: la ficha deja poner «image»; no hay campo de imagen (F01). Filtra «by product type»; no hay filtro de tipo en pantalla. Categorías «50 rows per page»; son 25. Movimientos «Filter by product … or date range»; en pantalla solo Tipo y Referencia (F16). «A reception shows the delivery note number that was typed»: la pantalla no pide albarán (F13).
- **`docs/screens.md`** («The widgets refresh on their own when `inventory.stock_changed` … arrives»): la venta no emite ese aviso, así que los paneles no se refrescan solos tras cobrar (F17, F21).
- **`docs/concepts.md`** («Settings: Track stock — Whether the hub keeps stock at all»): desde inventory#48 es el valor por defecto de los artículos que no lo fijan (F19, F20).
- **`docs/limits.md`** («A product uses its own threshold if it has one, otherwise the global threshold»), **`locales/es.json`** (`settings.fields.low_stock_threshold.description`) y el manual: el formulario y el CSV mandan siempre un umbral (10 si se deja vacío), así que el ajuste solo lo hereda un alta por el asistente o la API, y solo al crearse (F19).
- **Manual (`hand-book`)**: «Desde Productos o Movimientos, inicie una recepción. Añada cada producto»; la recepción es de un producto y solo desde Productos; Movimientos es de solo lectura (F13). Lo mismo para el recuento (F14). Llama «Configuración» a la pestaña «Ajustes».
- **Documento técnico** (§Integración): la anulación lee las líneas de la venta en una tabla de Ventas; hoy lee el propio libro de movimientos y no mira el control de stock de hoy (F23). Y «un void solo restituye las líneas cuyo producto controla»: devuelve lo que salió, sin mirar el ajuste actual.
- **Documento técnico**: llama «import CSV (`bulk_create`)» a la importación; la pantalla crea fila a fila con el alta normal y `bulk_create` solo lo usa el asistente (F09).
- **`docs/overview.md`**: «A void restock does not emit» el cruce de mínimo; cierto, y tampoco emite «stock_changed» (F23).
- **TAXES-F15**: «si no carga la lista de categorías, la importación falla»; no falla entera: las filas con texto fiscal acaban en «Fallidas» con «Falta la categoría fiscal» y las que no traen columna se preguntan igual (F09).
- **PRINTING-F12**: el aviso «Ninguna impresora tiene el rol «Etiqueta»…» solo sale si la puerta contesta «navegador» dentro de la app instalada, cosa que hoy no hace para una etiqueta: ahí sale «No se pudo imprimir la etiqueta del código de barras» con el motivo (leído en el código del hub, sin ejecutar) (F25).
- **`docs/limits.md` de Flujos**: «No hay evento de nivel de stock»; existe el aviso de cruce de mínimo desde inventory#47 (F18).
- **QA `qa-hub §4` y `qa-hub-beauty`**: dar de alta productos «con `tax_rate_id`»; el campo es `tax_category_key` (ADR-0085).
- **QA `qa-hub-restaurant` §7.12 y §7.13** esperan merma, devolución con reposición y receta: la merma solo existe por el asistente, la devolución no repone y no hay recetas (F15, F24).
- **Textos**: el Stock, el Saldo y la Diferencia se pintan con punto decimal («0.5») aunque la pantalla esté en español; los campos de cantidad aceptan coma.
