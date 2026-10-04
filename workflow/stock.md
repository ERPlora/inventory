# WORKFLOW — Inventario · Stock

Prefijo: INVENTORY

## Flujos

### INVENTORY-F13 Recibir mercancía
Estado: parcial — en pantalla se recibe un producto cada vez y sin número de albarán (un albarán con varios productos y su número, hasta 200 líneas, solo por el asistente o la API); el coste unitario sustituye el coste del producto, sin coste medio; la pantalla deja recibir stock en un servicio
Vertical: comun
Actor: administrador, responsable
Pantalla: Recepción
Pasos:
1. En **Productos**, pulsa «Recibir stock» en la fila o en la ficha del producto.
2. En «Recepción — <producto>» se ve el «Stock actual». Escribe la «Cantidad recibida» y, si quieres, el «Coste unitario (EUR)».
3. Pulsa «Registrar recepción». La ventana se cierra y la fila enseña el stock nuevo.
4. En **Movimientos** sale una línea «Recepción» con la cantidad en positivo y el saldo.
Entra: el producto y el escalón de su unidad (la pantalla no deja una cantidad que no encaje).
Sale: el stock sube; el movimiento «Recepción» con cantidad, saldo, coste y, si lo trae la API, el albarán; si se escribió coste, pasa a ser el coste del producto. Se aplica aunque el artículo no lleve control de stock. Si un artículo con control sube por encima de su umbral, avisa del cruce (INVENTORY-F18).
Si falla: «Registrar recepción» está apagado sin cantidad. «Introduce una cantidad válida con un máximo de 6 decimales», «La cantidad no respeta el incremento permitido para esta unidad», un coste ilegible («Esto no es un importe…») o «No se pudo registrar la recepción» salen dentro de la ventana. Por la API, una línea sin producto o con cantidad cero se salta sin avisar.
Implicados: ninguno
QA: qa-hub-restaurant §7.12

### INVENTORY-F14 Contar el stock de un producto
Estado: parcial — en un servicio la ventana se cierra como si se hubiera aplicado y no cambia nada
Vertical: comun
Actor: administrador, responsable
Pantalla: Recuento
Pasos:
1. En **Productos**, pulsa «Contar stock» en la fila o en la ficha.
2. En «Recuento — <producto>», escribe en «Stock contado» lo que hay de verdad (el total, no la diferencia): si el sistema dice 5 y cuentas 7, escribe 7. Aparece «Diferencia» (+2).
3. Escribe el «Motivo (obligatorio)».
4. Pulsa «Aplicar recuento». La fila enseña el saldo contado; en **Movimientos** sale «Recuento» con la diferencia y el motivo.
Entra: el producto y su saldo.
Sale: el saldo pasa a ser lo contado; el movimiento «Recuento» con la diferencia (si no hay diferencia, no se apunta nada) (avisa: inventory.stock_changed). Se aplica aunque el artículo no lleve control de stock. Si cruza el umbral de un artículo con control, en cualquier sentido, avisa del cruce (INVENTORY-F18).
Si falla: «Aplicar recuento» está apagado y dice qué falta: «Escribe el stock contado para continuar.» o «Hace falta un motivo para aplicar el recuento.». Una cantidad negativa o fuera del escalón: «Introduce una cantidad válida con un máximo de 6 decimales» / «La cantidad no respeta el incremento permitido para esta unidad». Un motivo de menos de 3 letras lo rechaza el servidor (sin confirmar el texto). Todo sale dentro de la ventana; si no, «No se pudo aplicar el recuento».
Implicados: ninguno
QA: qa-hub-restaurant §7.12

### INVENTORY-F15 Dar de baja stock sin venta (merma, rotura, consumo propio)
Estado: parcial — no hay pantalla: se hace con el asistente o la API; en pantalla, lo que hay es contar el stock (INVENTORY-F14)
Vertical: comun
Actor: asistente
Pantalla: asistente
Pasos:
1. Pide al asistente, por ejemplo, «da de baja 2 botellas de vino tinto por rotura».
2. El asistente descuenta esa cantidad del producto con el motivo.
3. En **Movimientos** sale «Descuento» con la cantidad en negativo y el motivo.
Entra: el producto, la cantidad (en el escalón de su unidad) y el motivo.
Sale: el stock baja y queda el movimiento «Descuento» (avisa: inventory.stock_changed); si cruza el umbral, avisa del cruce (INVENTORY-F18). La orden la tienen el responsable y el administrador.
Si falla: si no hay bastante y «Permitir vender sin stock» está apagado, «No hay stock suficiente para completar la operación.»; un producto que no existe, «Este producto no existe en este hub.»; una cantidad fuera del escalón, «Esa cantidad no encaja en la unidad del producto…» (no se redondea); si el hub no puede leer la unidad del producto, la orden se para sin mover nada. Un servicio o un artículo sin control de stock: no pasa nada y no es un error.
Implicados: ninguno
QA: qa-hub-restaurant §7.12

### INVENTORY-F16 Consultar el historial de movimientos
Estado: parcial — no enseña quién hizo cada movimiento; no hay filtro de fecha ni de producto en pantalla (la consulta los tiene); no se exporta; el stock inicial del alta, del CSV y de la plantilla no aparece
Vertical: comun
Actor: administrador, responsable, empleado, cajero
Pantalla: Movimientos
Pasos:
1. Abre **Inventario → Movimientos**: los más recientes primero.
2. Busca por producto, SKU o referencia, o escribe el número de un tique, una factura o una venta: se busca la venta que nombra y salen su venta y su anulación.
3. Filtra por Tipo o por Referencia; ordena por Fecha, Cantidad o Saldo.
4. En una venta, la Referencia es el número de su tique o factura (o, sin Facturación, el número de la venta); en tableta, tocar una referencia cortada la despliega.
Entra: el libro de movimientos; el número de la factura o el tique de cada venta (Facturación) y, si no hay, el número de la venta (Ventas), pedidos solo para pintarlos.
Sale: nada (solo lectura; no se edita ni se borra ningún movimiento).
Si falla: si no se puede leer Facturación ni Ventas (no instaladas o sin permiso), la celda Referencia de una venta sale vacía en vez del identificador interno. Error de carga: el aviso de la tabla con reintento.
Implicados: pendiente
Pendiente de enlazar: invoice — INVOICE-F20 la factura o el tique de una venta, para pintar su número
Pendiente de enlazar: sales — SALES-F28 el número de una venta, para pintarlo y para buscarla
QA: qa-hub-restaurant §7.12, qa-hub-restaurant §7.15

### INVENTORY-F17 Ver el panel y los productos con stock bajo
Estado: hecho
Vertical: comun
Actor: administrador, responsable, empleado, cajero
Pantalla: Panel
Pasos:
1. Abre **Inventario → Panel**: «Productos seguidos», «En stock», «Agotados» (saldo 0 o menos), «Stock bajo» (saldo igual o menor que su umbral) y «Valor de existencias» a coste. Tocar una de las cuatro primeras lleva a **Productos**.
2. Debajo, «Productos con stock bajo», del que menos tiene al que más, con su umbral.
3. En el **Inicio** del hub, los paneles «Stock bajo», «Valor de inventario» y «Productos con menos stock» (y, si se añade, «Productos en stock») dan las mismas cifras.
Entra: los productos activos, físicos y con control de stock; el valor es la suma de coste por saldo de los que tienen saldo positivo (un saldo negativo no resta).
Sale: nada.
Si falla: «No se pudieron cargar las métricas del inventario.» y el aviso de la tabla con reintento. Los paneles del Inicio se refrescan solos con un recuento, un descuento directo o el alta, el cambio o el borrado de un producto, pero no tras una venta ni una recepción: hasta recargar enseñan la cifra anterior.
Implicados: pendiente
Pendiente de enlazar: hub — los paneles (widgets) del Inicio y cuándo se refrescan
QA: qa-hub-restaurant §7.12

### INVENTORY-F18 Avisar cuando un artículo cruza su mínimo
Estado: parcial — nadie lo enseña: no hay aviso en pantalla ni notificación, solo el aviso interno que hay que conectar a un flujo; la anulación de una venta no lo emite; en una venta que no bajó el stock por falta de saldo (INVENTORY-F21) sale igual, con cantidades que no se apuntaron
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Una venta, un descuento, una recepción o un recuento lleva un artículo con control de stock de estar por encima de su umbral a estar en él o por debajo: Inventario emite el aviso de cruce «por debajo».
2. Mientras siga por debajo, no se repite. Cuando vuelve a subir por encima, emite «recuperado», y eso rearma el siguiente.
3. Si el mismo artículo va en varias líneas de una venta (suelto y dentro de un menú), se decide una vez sobre el total.
4. Para que alguien se entere, el responsable crea un flujo en **Flujos** que se dispare con este aviso (por ejemplo, avisar para reponer).
Entra: el saldo de antes, leído justo antes del movimiento, y el umbral del producto.
Sale: el aviso (inventory.low_stock_crossed) con el producto, su SKU y su nombre, la cantidad de antes y la de después, el umbral, el tipo de movimiento y la venta o el albarán.
Si falla: si no se pudo leer el saldo de antes, no se emite ningún cruce (no se adivina). Si dos movimientos se cruzan en el tiempo, uno puede perderse (nunca se duplica).
Implicados: pendiente
Pendiente de enlazar: flows — disparar un flujo cuando un artículo cruza su mínimo
QA: qa-hub-restaurant §7.12

### INVENTORY-F19 Ajustar el inventario
Estado: parcial — en la pestaña solo guarda el administrador (el responsable tiene el permiso y lo puede hacer por el asistente); «Permitir vender sin stock» apagado no impide vender: deja el stock sin bajar (INVENTORY-F21); «Umbral de stock bajo» solo lo hereda un producto creado por el asistente o la API, y solo al crearse
Vertical: comun
Actor: administrador
Pantalla: Ajustes
Pasos:
1. Abre **Inventario → Ajustes**.
2. «Controlar stock» (de fábrica, encendido): es lo que hacen los artículos que no han decidido por sí mismos (INVENTORY-F20).
3. «Permitir vender sin stock» (de fábrica, apagado): encendido, una venta baja el stock aunque quede en negativo; apagado, si una venta pide más de lo que queda, ese artículo no baja nada (la venta se cobra igual) y un descuento directo se rechaza.
4. «Umbral de stock bajo» (de fábrica, 10, en unidades enteras): el umbral con el que nace un producto que no trae el suyo. El formulario y el CSV siempre mandan uno (10 si se deja vacío) y cambiarlo no toca los productos que ya existen.
5. Pulsa «Guardar»: «Ajustes guardados.».
Entra: los ajustes guardados del negocio (uno por negocio); sin guardar nunca, valen los de fábrica.
Sale: los ajustes. No avisan a nadie; se aplican desde el siguiente movimiento.
Si falla: «No se pudieron guardar los ajustes.». A quien no es administrador: «Solo un administrador puede cambiar estos ajustes.». Sin el permiso de ajustes (empleado, cajero), los valores no cargan («No se pudieron cargar los ajustes.», sin confirmar en pantalla).
Implicados: pendiente
Pendiente de enlazar: hub — la pestaña Ajustes de un módulo, que solo deja guardar al administrador
Pendiente de enlazar: sales — SALES-F01 el TPV no mira el stock al cobrar
QA: qa-hub-restaurant §7.03 (discrepa)

### INVENTORY-F20 Decidir qué artículos llevan control de stock
Estado: hecho
Vertical: comun
Actor: administrador, responsable
Pantalla: Productos
Pasos:
1. En el formulario de un producto físico, mira «Controlar stock de este artículo»: marcada o no según lo que vale hoy para él; debajo, «Sigue el ajuste del hub» mientras no se toque.
2. Desmárcala para que sea solo de catálogo («Solo catálogo: las ventas no mueven su stock») o márcala para que lleve stock aunque el negocio no lo haga.
3. Guarda. En **Productos**, la columna Stock de un artículo sin control enseña «—».
Entra: el ajuste «Controlar stock» del negocio, para lo que se enseña antes de decidir.
Sale: la decisión del artículo (avisa: inventory.product.created / inventory.product.updated). Vale la del artículo; si no tiene, la del negocio; si no hay ajustes guardados, sí; un servicio nunca. Sin control, la venta no lo mueve, no sale en stock bajo ni en las cifras del Panel y no cruza su mínimo; recibir y contar sí lo mueven.
Si falla: los rechazos del formulario (INVENTORY-F01). Una vez decidido, el artículo no vuelve a «Sigue el ajuste del hub» (INVENTORY-F02).
Implicados: pendiente
Pendiente de enlazar: sales — SALES-F01 la venta de un artículo sin control de stock no mueve su stock
QA: qa-hub-restaurant §7.03
