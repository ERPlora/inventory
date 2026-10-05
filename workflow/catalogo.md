# WORKFLOW — Inventario · Catálogo

Prefijo: INVENTORY

## Flujos

### INVENTORY-F01 Dar de alta un producto
Estado: parcial — no hay campo de foto; el precio por una cantidad distinta de la unidad (por 100 g, por kg con el stock en gramos) solo se fija por el asistente o la API; el servidor no comprueba que la categoría fiscal exista en Impuestos, así que por el asistente o la API entra una clave inventada y el TPV marca el artículo como no vendible; el «Stock inicial» no deja movimiento en el libro
Vertical: comun
Actor: administrador, responsable
Pantalla: Productos
Pasos:
1. En **Productos**, pulsa **+**: se abre el panel del formulario.
2. Escribe Nombre, SKU y Precio (se admite «2,20», «1.234,56» o lo pegado de la pantalla; al salir del campo se reescribe en el formato del negocio). Opcional: «Coste (EUR)», «Stock inicial», «Umbral stock bajo» (vacío = 10), «EAN-13», «Descripción».
3. Elige «Tipo» («Físico» o «Servicio»), la «Unidad de medida» («Unidad (ud)» por defecto) y la «Categoría fiscal»: cada opción dice su tipo («Producto — general · 21 %», «… · exento»). No hay ninguna elegida de antemano.
4. Si el producto es físico, la casilla «Controlar stock de este artículo» sale marcada o no según el ajuste del negocio, con la nota «Sigue el ajuste del hub»; tocarla fija la decisión para este artículo (INVENTORY-F20).
5. Si hay categorías, marca las que agrupan el producto en el TPV en «Categorías».
6. Pulsa «Guardar» («Guardando…»). El panel se cierra y el producto sale en la tabla con Estado «Sí».
Entra: las categorías fiscales y sus tipos (Impuestos); las unidades de medida y las categorías de producto (este módulo).
Sale: el producto, activo, con su stock inicial y enlazado a las categorías marcadas en la misma operación (avisa: inventory.product.created). Ventas lo ofrece en la rejilla del TPV; la lista «Termina de configurar tu negocio» da por hecho el paso del catálogo (INVENTORY-F28).
Si falla: «Guardar» está apagado mientras falten Nombre, SKU o categoría fiscal. Sin categorías fiscales sale «Todavía no hay categorías fiscales. Créalas en Impuestos: un producto no se puede vender sin saber cómo tributa.». Un importe ilegible: «Esto no es un importe. Escribe una cifra, por ejemplo 12,50.» o «Este importe se puede leer de dos maneras…»; una cantidad mala: «Introduce una cantidad válida con un máximo de 6 decimales» o «La cantidad no respeta el incremento permitido para esta unidad». Un SKU o un EAN-13 que ya tiene otro producto vivo se rechaza; la pantalla tiene «Ese SKU ya existe en el catálogo», pero solo lo pone si el mensaje del servidor nombra el SKU, y el hub oculta el detalle de la base de datos (sin confirmar qué texto sale). Todo rechazo sale dentro del panel y no se guarda nada.
Implicados: SALES-F01, TAXES-F01, TAXES-F19, REC_PELUQUERIA-F04, REC_RESTAURANTE-F03
QA: qa-hub §4, qa-hub-restaurant §7.03

### INVENTORY-F02 Editar un producto
Estado: parcial — no se puede cambiar el tipo (físico o servicio); cambiar la unidad no convierte el saldo (3 unidades pasan a ser 3 kg); un artículo que ya fijó su control de stock no puede volver a «Sigue el ajuste del hub»; las categorías se guardan después del producto y una a una, así que si una falla el resto del cambio ya quedó guardado
Vertical: comun
Actor: administrador, responsable
Pantalla: Productos
Pasos:
1. En **Productos**, pulsa «Editar» en la fila (o la marca «Sin configurar»): se abre el panel con el título «Editando producto — <nombre>» y los datos actuales.
2. Cambia lo que haga falta. El SKU está bloqueado («El SKU es la identidad del producto: no se edita»); el stock no se edita aquí (INVENTORY-F13, INVENTORY-F14); el «Tipo» y el «Stock inicial» no salen.
3. Pulsa «Guardar cambios». «Cancelar edición» o cerrar el panel lo deja como estaba.
4. La fila enseña los datos nuevos.
Entra: el producto completo (este módulo); categorías fiscales (Impuestos); unidades y categorías de producto.
Sale: el producto cambiado (avisa: inventory.product.updated) y cada categoría añadida o quitada (avisa: inventory.product.categorized / inventory.product.uncategorized). El precio nuevo vale para lo que se añada a una cuenta desde ahora: una cuenta abierta conserva el de cuando se pidió (lo decide Ventas).
Si falla: los mismos rechazos que el alta (INVENTORY-F01), dentro del panel. Vaciar la categoría fiscal no se puede: «Elige la categoría fiscal: sin ella el producto no se puede vender.».
Implicados: SALES-F01, TAXES-F01, TAXES-F19
QA: qa-hub-restaurant §7.03

### INVENTORY-F03 Activar y desactivar un producto
Estado: hecho
Vertical: comun
Actor: administrador, responsable
Pantalla: Productos
Pasos:
1. En **Productos**, toca el interruptor de la columna Estado de la fila.
2. Apagado, el producto pasa a «No»; encendido, a «Sí». Un producto «Sin configurar» no tiene interruptor hasta que tenga categoría fiscal (INVENTORY-F05).
Entra: el producto completo (se relee antes de guardar para no perder campos).
Sale: el producto activo o inactivo (avisa: inventory.product.updated). Inactivo, deja de salir en el TPV y en el catálogo que lee Ventas al cobrar, en las cifras del Panel, en la lista de stock bajo y en el número de productos de cada categoría; sigue en Productos y en sus movimientos.
Si falla: el motivo sale encima de la tabla («No se pudo actualizar el producto» o el del servidor). Sin permiso de cambio se ve «Sí»/«No» sin interruptor.
Implicados: SALES-F01, REC_RESTAURANTE-F03
QA: ninguno

### INVENTORY-F04 Eliminar un producto
Estado: hecho
Vertical: comun
Actor: administrador, responsable
Pantalla: Productos
Pasos:
1. En **Productos**, pulsa «Eliminar» en la fila.
2. La ventana «Eliminar producto» dice «<nombre> (<SKU>) — se eliminará del catálogo (borrado lógico; sus movimientos de stock se conservan)».
3. Pulsa «Eliminar» (o «Cancelar»). La fila desaparece.
Entra: el producto elegido.
Sale: el producto marcado como borrado, inactivo y fuera de todas las listas y del TPV; su SKU y su EAN-13 quedan libres para otro producto; sus movimientos siguen en **Movimientos** con su nombre (avisa: inventory.product.deleted). No mira si tiene stock ni si está en una cuenta abierta: Ventas rechaza al cobrar la línea de un producto que ya no está en el catálogo.
Si falla: «No se pudo eliminar el producto» (o el motivo del servidor) encima de la tabla.
Implicados: SALES-F01
QA: ninguno

### INVENTORY-F05 Revisar los productos que no se pueden vender por falta de IVA
Estado: hecho
Vertical: comun
Actor: administrador, responsable
Pantalla: Productos
Pasos:
1. En el TPV, el aviso «N artículos no se pueden vender: les falta configurar el IVA.» trae «Revisar el catálogo» (solo a quien puede cambiar productos): abre **Productos** ya filtrado por «Sin configurar», con el filtro de Estado enseñándolo. También se llega filtrando Estado → «Sin configurar».
2. Cada fila lleva la marca «Sin configurar · Falta la categoría fiscal»: tocarla abre el formulario de edición.
3. Elige la «Categoría fiscal» y pulsa «Guardar cambios». El producto pasa a «Sí».
Entra: los productos sin categoría fiscal (vacía o nula), que vienen de antes de que fuera obligatoria; no se les inventa ninguna.
Sale: el producto con su categoría (avisa: inventory.product.updated); el TPV deja de marcarlo «Falta el IVA».
Si falla: los rechazos del formulario (INVENTORY-F02).
Implicados: SALES-F01, TAXES-F01, REC_RESTAURANTE-F03
QA: qa-hub §4

### INVENTORY-F06 Crear y editar una categoría
Estado: parcial — icono, color, orden y descripción solo por el asistente o la API, y la imagen no la escribe ninguna orden; y el TPV ordena las categorías por nombre; el «Tipo de IVA / Impuesto» de la categoría se guarda pero ningún módulo lo usa (los productos no lo heredan); editar desde la pantalla borra la descripción puesta por el asistente; no hay desactivar en pantalla, y una categoría desactivada por la API desaparece de la lista sin forma de volver
Vertical: comun
Actor: administrador, responsable
Pantalla: Categorías
Pasos:
1. En **Categorías**, pulsa **+** (o toca una fila para editarla: «Editando categoría — <nombre>»).
2. Escribe el Nombre; «Slug (opcional)» se rellena solo con el nombre en minúsculas y guiones si se deja vacío; elige si quieres «Tipo de IVA / Impuesto» («— (por defecto)» lo deja vacío).
3. Pulsa «Guardar» o «Guardar cambios». La categoría sale en la tabla con su número de productos.
Entra: las categorías fiscales y sus tipos (Impuestos).
Sale: la categoría guardada, activa. No avisa a nadie. Ventas la lee para la tira de categorías del TPV y Cocina para elegir por qué categorías enruta cada estación (lo que pintan lo decide cada uno).
Si falla: «Guardar» está apagado sin Nombre; un rechazo sale dentro del panel («No se pudo guardar la categoría» o el del servidor).
Implicados: KITCHEN-F04, SALES-F01, TAXES-F01
QA: qa-hub-restaurant §7.03

### INVENTORY-F07 Eliminar una categoría
Estado: hecho
Vertical: comun
Actor: administrador, responsable
Pantalla: Categorías
Pasos:
1. En **Categorías**, pulsa «Eliminar» en la fila.
2. La ventana «Eliminar categoría» dice «<nombre> — N producto(s) quedarán sin esta categoría (se desvinculan; los productos no se borran)». N cuenta los productos activos.
3. Pulsa «Eliminar y desvincular» (o «Cancelar»).
Entra: la categoría elegida.
Sale: la categoría borrada (lógico) y todos sus productos, activos o no, desvinculados en la misma operación; los productos siguen. El TPV deja de agruparlos bajo ella. No avisa a nadie.
Si falla: «No se pudo eliminar la categoría» (o el motivo del servidor) encima de la tabla.
Implicados: KITCHEN-F04, SALES-F01
QA: ninguno

### INVENTORY-F08 Agrupar productos en categorías para el TPV
Estado: parcial — no se elige el orden de los productos ni de las categorías en el TPV (los ordena por nombre), y se asignan producto a producto, no desde la categoría
Vertical: comun
Actor: administrador, responsable
Pantalla: Productos
Pasos:
1. Crea antes la categoría (INVENTORY-F06).
2. En el formulario del producto (alta o edición), marca una o varias en «Categorías» (el campo solo sale si hay alguna).
3. Guarda. En **Categorías**, la columna Productos sube; en el TPV, el artículo sale bajo esa categoría.
Entra: las categorías activas del negocio.
Sale: el enlace producto–categoría (avisa al editar: inventory.product.categorized / inventory.product.uncategorized; en el alta va dentro de inventory.product.created). Un producto puede estar en varias. Ventas filtra la rejilla con este mapa (que solo trae productos activos); Cocina lee las categorías y los productos para su enrutado.
Si falla: al editar, el enlace se guarda después del producto; si falla, sale el motivo en el panel y el producto ya quedó guardado (INVENTORY-F02). Un producto sin categoría se vende igual, solo que sale en «Todos».
Implicados: KITCHEN-F04, SALES-F01, REC_RESTAURANTE-F03
QA: qa-hub-restaurant §7.03
