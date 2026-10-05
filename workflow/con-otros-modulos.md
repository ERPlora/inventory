# WORKFLOW — Inventario · Con otros módulos

Prefijo: INVENTORY

## Flujos

### INVENTORY-F21 Bajar el stock al cobrarse una venta
Estado: parcial — con «Permitir vender sin stock» apagado (el de fábrica), un artículo que se vende por encima de su saldo no baja nada y nadie se entera: la venta se cobra y no queda movimiento; tras una venta no se refrescan solos ni la lista de Productos ni los paneles; el aviso de mínimo puede salir con cantidades que no se apuntaron (INVENTORY-F18)
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Ventas cobra un tique y avisa de la venta cobrada (SALES-F01). En Inventario no se hace nada a mano.
2. Por cada línea con un artículo del catálogo, Inventario baja la cantidad vendida, también si la línea va invitada. No mueven nada una línea de servicio, una de precio libre, un suplemento ni un artículo sin control de stock.
3. Si el mismo artículo va en varias líneas, cada una deja su movimiento.
4. Se comprueba en **Movimientos**: una línea «Venta» por línea del tique, con su número como referencia, y el saldo que quedó.
Entra: la venta cobrada, de Ventas: cada línea con su artículo, su cantidad (exacta, ya comprobada contra el escalón al cobrar), si es servicio y, si es un menú, sus componentes (INVENTORY-F22).
Sale: el stock baja y queda el movimiento «Venta» con la venta como referencia, en una sola sentencia. Con «Permitir vender sin stock» encendido, el saldo puede quedar en negativo. Si cruza el mínimo, avisa (INVENTORY-F18). Si el negocio no controla stock y ninguna línea lo controla, marca la venta como «sin movimientos» para que su anulación no reponga nada. No emite el aviso de stock cambiado.
Si falla: la venta ya está cobrada; si Inventario no puede aplicar el aviso, lo reintenta el hub y, si sigue fallando, queda en su lista de avisos fallidos, sin nada en la pantalla de Inventario. Dos ventas a la vez sobre la última unidad: con el ajuste apagado, la segunda no baja nada; encendido, queda en negativo.
Implicados: SALES-F01, SALES-F11, SALES-F15, REC_PELUQUERIA-F09, REC_RESTAURANTE-F11, REC_RESTAURANTE-F17, HUB-F52, HUB-F54, HUB_SHELL-F146
QA: R-04, B-05, BD-09, qa-hub-restaurant §7.03 (discrepa), qa-hub-restaurant §8

### INVENTORY-F22 Bajar el stock de los componentes de un menú o un pack
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Ventas cobra un menú (o un pack) con las elecciones del cliente (SALES-F12).
2. Inventario baja cada componente elegido con la cantidad de la línea: tres menús, tres raciones de cada plato. El menú no tiene stock y nunca sale en **Movimientos**.
3. Un componente que es servicio (lo normal en un pack de peluquería) o que no lleva control de stock no mueve nada, y no es un error.
4. Si un artículo va suelto y dentro de un menú en el mismo tique, el cruce de mínimo se decide una vez sobre el total.
Entra: los componentes de la línea, que Ventas congela del menú de Menús al cobrar.
Sale: un movimiento «Venta» por componente; la anulación los repone igual (INVENTORY-F23).
Si falla: como INVENTORY-F21.
Implicados: COMBOS-F10, SALES-F12, REC_RESTAURANTE-F11
QA: qa-hub-restaurant §7.03, qa-hub-restaurant §7.12

### INVENTORY-F23 Reponer el stock al anularse una venta
Estado: parcial — si la bajada de la venta se retrasa (reintento del aviso) y la anulación llega antes, la anulación no repone nada y la bajada se aplica después: el stock queda bajado por una venta anulada, sin aviso
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. El responsable anula una venta en Ventas (SALES-F30).
2. Inventario devuelve a cada artículo exactamente lo que esa venta le quitó, según su propio libro: menús por sus componentes, y nada de lo que no llegó a bajar (sin control de stock, sin saldo, servicios).
3. En **Movimientos** sale una línea «Anulación» por artículo, con la misma referencia que la venta.
Entra: la venta anulada, de Ventas (solo cuál es).
Sale: el stock sube y queda el movimiento «Anulación». Devuelve lo que salió aunque el artículo haya dejado de controlar stock entre medias. No avisa del cruce de mínimo ni de stock cambiado.
Si falla: una segunda entrega del mismo aviso no repone dos veces. Un artículo borrado después de la venta no recupera nada. Si el aviso no se puede aplicar, lo reintenta el hub (INVENTORY-F21). Si el aviso de la venta cobrada falla y se reintenta después del de la anulación (la cola entrega en paralelo y reintenta hasta 8 veces), la anulación no encuentra nada que reponer y deja su marca, pero la bajada de la venta no mira esa marca: se aplica después y el stock queda bajado por una venta anulada, sin aviso; se corrige contando (INVENTORY-F14) (leído en el código, sin ejecutar).
Implicados: SALES-F30, REC_PELUQUERIA-F14, REC_RESTAURANTE-F15
QA: R-11, B-08, qa-hub-restaurant §7.13

### INVENTORY-F24 Reponer el stock de una devolución
Estado: no hecho — Inventario no escucha la devolución: devolver una venta, entera o en parte, no devuelve nada al stock
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. El responsable devuelve una venta en Ventas (SALES-F31).
2. En Inventario no pasa nada: el stock sigue como lo dejó la venta.
3. Si el artículo vuelve a la estantería, el responsable lo cuenta (INVENTORY-F14) o lo recibe (INVENTORY-F13).
Entra: nada (el aviso de venta devuelta existe, pero Inventario no lo escucha).
Sale: nada.
Si falla: el stock queda por debajo de lo real hasta el siguiente recuento.
Implicados: SALES-F31, REC_PELUQUERIA-F14, REC_RESTAURANTE-F15
QA: R-11, B-08, qa-hub-restaurant §7.12

### INVENTORY-F25 Imprimir la etiqueta del código de barras
Estado: parcial — la etiqueta lleva el SKU, no el EAN-13; por la cola del hub cada producto saca su etiqueta una sola vez: volver a pulsar, hoy o dentro de un mes, no saca otra y no dice nada; si ningún equipo imprime etiquetas, queda en espera sin aviso; solo directa por la impresora del dispositivo cada pulsación saca una
Vertical: comun
Actor: administrador, responsable, empleado, cajero
Pantalla: Ficha del producto
Pasos:
1. Abre la ficha del producto (toca la fila o «Detalles»): se ve el código de barras de su SKU.
2. Pulsa «Imprimir código de barras».
3. En la app instalada con una impresora de función «Etiqueta» a su alcance, sale al momento: nombre, código de barras y precio.
4. Si no, la etiqueta va a la cola de impresión del hub y la saca el equipo que imprima etiquetas.
Entra: el SKU, el nombre y el precio del producto; la impresora con la función «Etiqueta» (Impresión).
Sale: el papel, o un trabajo en la cola del hub con la clave del SKU (la misma cada vez).
Si falla: si la puerta de impresión del hub no lo puede mandar a ningún sitio, dentro de la ficha sale «No se pudo imprimir la etiqueta del código de barras» con el motivo. En un navegador, si la cola no lo acepta, se abre el diálogo de imprimir del navegador (código, SKU y nombre, sin precio). El aviso «Ninguna impresora tiene el rol «Etiqueta»: asígnale una en Impresión» no sale nunca: dentro de la app instalada la puerta del hub contesta «ningún sitio» para una etiqueta, nunca «navegador». Se arregla asignando la función «Etiqueta» a una impresora (PRINTING-F04).
Implicados: PRINTING-F04, PRINTING-F12, HUB-F190, HUB-F192, HUB_PERIPHERALS-F12, HUB_SHELL-F77
QA: qa-hub §8

### INVENTORY-F26 Vender al peso o por medida: unidades y escalón
Estado: parcial — la báscula no existe: nada manda el peso al TPV; referir el precio a otra cantidad o unidad (por 100 g, por kg con el stock en gramos) solo por el asistente o la API; no se pueden crear unidades; cambiar la unidad de un producto con stock no convierte el saldo
Vertical: comun
Actor: administrador, responsable
Pantalla: Productos
Pasos:
1. En el formulario del producto, elige la «Unidad de medida»: «Unidad (ud)», «Kilogramo (kg)», «Gramo (g)», «Tonelada (t)», «Litro (l)», «Mililitro (ml)», «Minuto (min)» u «Hora (h)».
2. Cada una tiene su escalón: el gramo dentro del kilo, el mililitro dentro del litro, el kilo dentro de la tonelada, el cuarto de hora en la hora y la unidad entera en las demás.
3. Stock inicial, umbral, recepción y recuento solo admiten cantidades de ese escalón.
4. En el TPV el artículo se vende tecleando la cantidad (0,532 kg) y la venta baja esa cantidad exacta, sin redondear (SALES-F10).
Entra: las unidades del negocio, sembradas al instalar el módulo.
Sale: el producto con su unidad. Ventas la lee para la línea; el precio se entiende por 1 de la unidad (lo cobra Ventas, sin confirmar aquí).
Si falla: en pantalla, «La cantidad no respeta el incremento permitido para esta unidad»; en el descuento directo, «Esa cantidad no encaja en la unidad del producto…». Un producto con una unidad que no está en el registro no comprueba escalón, para no bloquear la venta.
Implicados: SALES-F10
Pendiente de enlazar: hub — leer la báscula y mandar el peso al TPV (no existe)
QA: qa-hub-restaurant §7.03

### INVENTORY-F27 Entregar el catálogo al TPV, a Cocina y a Menús
Estado: hecho
Vertical: comun
Actor: sistema
Pantalla: ninguna
Pasos:
1. Al abrir el TPV, Ventas lee de Inventario los productos, las categorías activas, el mapa producto–categoría y las unidades; y al cobrar, el catálogo de venta entero (sin páginas) con precio, coste, categoría fiscal, unidad y si cada artículo lleva control de stock.
2. Cocina lee los productos y las categorías para elegir qué enruta cada estación.
3. Menús lee los productos que se pueden poner como componente.
4. Sin Inventario instalado, el TPV lo dice en la rejilla («… no está instalada, así que no hay rejilla de productos. Puedes cobrar servicios y ventas a precio libre; …») y vende servicios y precio libre.
Entra: nada; lo piden los demás por sus consultas públicas.
Sale: las lecturas. Solo salen productos activos y no borrados en el catálogo de venta y en el mapa de categorías; el catálogo de venta no lleva stock, así que el TPV no enseña ni comprueba disponibilidad.
Si falla: lo decide quien lee: Ventas rechaza una línea de catálogo si no puede leer el catálogo de venta y avisa en el TPV si Inventario está instalado y no contesta; Cocina se queda sin opciones de enrutado.
Implicados: COMBOS-F06, KITCHEN-F04, SALES-F01, REC_RESTAURANTE-F06
QA: R-04, B-05

### INVENTORY-F28 Completar el primer paso «Tu catálogo»
Estado: hecho
Vertical: comun
Actor: administrador, responsable
Pantalla: Hub: Termina de configurar tu negocio
Pasos:
1. En la lista «Termina de configurar tu negocio» sale el paso obligatorio «Tu catálogo» («Añade al menos un producto para que haya algo que vender.»).
2. «Configurar» lleva a **Inventario → Productos**.
3. En cuanto hay un producto activo (físico o de tipo servicio), el paso sale hecho.
Entra: el número de productos activos.
Sale: el paso hecho o pendiente. El paso declara el permiso de dar de alta productos (a quién se lo enseña lo decide el hub).
Si falla: si se desactivan o borran todos los productos, el paso vuelve a pendiente.
Implicados: HUB-F35, HUB_SHELL-F31
QA: BD-01
