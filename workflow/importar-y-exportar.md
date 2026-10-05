# WORKFLOW — Inventario · Importar y exportar

Prefijo: INVENTORY

## Flujos

### INVENTORY-F09 Importar productos desde un CSV
Estado: parcial — solo separa por comas: un CSV con punto y coma (el que guarda Excel en español) llega como una sola columna y no se puede mapear; un SKU que ya existe se omite, así que no sirve para actualizar precios; todo entra como «Físico», sin categoría comercial, sin foto y siguiendo el control de stock del negocio; el stock que trae no deja movimiento; si falla crear un alias o una categoría en Impuestos, no se avisa y sus filas acaban «Falta la categoría fiscal»; el texto fiscal se compara con la clave y el nombre de fábrica (en inglés) y con los alias, no con el nombre traducido; el permiso de importar solo lo mira la pantalla (el servidor pide el de alta)
Vertical: comun
Actor: administrador, responsable
Pantalla: Importar productos
Pasos:
1. En **Productos**, pulsa el botón de importar CSV de la tabla y elige el fichero (con cabecera en la primera línea). No se crea nada todavía.
2. En «Revisa la importación», cada columna trae su campo adivinado por la cabecera, en español o inglés y con o sin tildes («Nombre», «Código», «Precio», «IVA»…); cámbialo o pon «No importar». Se pueden importar Nombre, SKU, Precio, Coste, Stock, Umbral, EAN-13, Descripción, Unidad y Categoría fiscal; Nombre y SKU son obligatorias.
3. Mira las «Primeras {n} filas de {total}» y el ensayo de todo el fichero: «{ready} fila(s) listas · {failed} con problemas», con la línea y el motivo de las primeras diez.
4. Pulsa «Importar {n} producto(s)» (o «Cancelar», que no deja rastro).
5. Si algún texto fiscal no se reconoce, o hay filas sin columna fiscal («Filas sin categoría fiscal»), sale «Categorías fiscales del CSV»: para cada uno, «Elegir» una categoría, «Crear» una (Clave y Nombre) u «Omitir». Pulsa «Confirmar e importar». La decisión se guarda en Impuestos y la próxima importación ya la sabe, salvo la de «Filas sin categoría fiscal», que no se guarda y se pregunta cada vez («Crear» ahí crea la categoría sin alias).
6. Mientras crea, encima de la tabla se lee «Importando {done}/{total}…» con «Parar».
7. Al acabar, «Resultado de la importación»: «Filas», «Creadas», «Omitidas (ya existían)», «Fallidas», una línea por fallo y «Copiar informe».
Entra: el fichero; las categorías fiscales y sus alias (Impuestos); las unidades.
Sale: un producto activo por fila lista, creado uno a uno (avisa cada uno: inventory.product.created); en Impuestos, los alias aprendidos y las categorías creadas desde la ventana fiscal. Una fila con un SKU que ya tiene un producto vivo se cuenta como omitida y ese producto no se toca; un SKU de un producto borrado crea uno nuevo.
Si falla: motivos de fila: «Faltan nombre o SKU», «Precio no numérico» (también para el coste), «SKU duplicado en el fichero», «Introduce una cantidad válida con un máximo de 6 decimales», «La cantidad no respeta el incremento permitido para esta unidad», «Falta la categoría fiscal» o el del servidor. Si no se pueden leer las categorías de Impuestos, la importación sigue: las filas con texto fiscal acaban fallidas con «Falta la categoría fiscal» y las que no traen columna se preguntan igual. Si el texto no casa y falla la búsqueda de alias, se pregunta. «Cancelar» en la ventana fiscal no importa nada. «Parar» deja lo ya creado y el informe dice «La importación se paró a medias. Lo que ya se había creado está contado abajo; el resto del fichero se quedó como estaba.».
Implicados: TAXES-F02, TAXES-F14, TAXES-F15
QA: ninguno

### INVENTORY-F10 Importar categorías desde un CSV
Estado: parcial — no hay vista previa ni informe: las cabeceras tienen que llamarse exactamente `name` (y `slug`); una fila que falla se descarta sin decir nada; un texto fiscal que no se reconoce deja la categoría sin tipo, sin preguntar; repetir el fichero duplica las categorías; solo separa por comas
Vertical: comun
Actor: administrador, responsable
Pantalla: Categorías
Pasos:
1. En **Categorías**, pulsa el botón de importar CSV de la tabla y elige el fichero.
2. Se crea al momento una categoría por fila con nombre; el slug, si no viene, se saca del nombre. Una columna fiscal (`iva`, `tax`, `vat`…) se busca entre las categorías y alias de Impuestos.
3. La tabla se recarga con lo que entró.
Entra: el fichero; las categorías fiscales y sus alias (Impuestos).
Sale: las categorías creadas. No avisa a nadie.
Si falla: no se enseña nada; lo que no entró simplemente no está en la tabla.
Implicados: TAXES-F15
QA: ninguno

### INVENTORY-F11 Exportar el catálogo a CSV
Estado: parcial — solo baja la página que se ve (50 filas, o hasta 100 si se cambian las filas por página) y con las cifras como se guardan: un café de 2,20 € sale «220» y 3 unidades salen «3000000», así que reimportar el fichero multiplica el precio por 100 y el stock por un millón; las cabeceras son los nombres internos (`name`, `sku`, `price`, `stock`, `is_active`) y faltan coste, categoría fiscal, unidad y EAN-13; el permiso de exportar solo lo mira la pantalla (el fichero sale de lo que ya trajo la lista, que pide el de ver productos)
Vertical: comun
Actor: administrador, responsable
Pantalla: Productos
Pasos:
1. En **Productos** (con la búsqueda y los filtros que quieras), pulsa el botón de exportar CSV de la tabla.
2. Se descarga `inventory-products.csv` con las filas de la página en pantalla.
3. En **Categorías**, el mismo botón descarga `inventory-categories.csv` (nombre, slug y número de productos de la página).
Entra: las filas que la tabla tiene cargadas.
Sale: el fichero. No guarda ni avisa nada.
Si falla: sin filas, el fichero lleva solo la cabecera. Sin permiso de exportar, el botón no sale.
Implicados: ninguno
QA: ninguno

### INVENTORY-F12 Cargar la carta de una plantilla del sector
Estado: hecho
Vertical: comun
Actor: administrador
Pantalla: Hub: Ajustes → Datos y copias → Importar
Pasos:
1. En los Ajustes del hub, abre «Datos y copias» → «Importar» (solo el administrador).
2. Elige una plantilla publicada para tu negocio («Desde erplora.com») o sube un `.blueprint.zip`.
3. El hub instala las apps que falten y aplica sus datos; Inventario recibe sus productos, categorías y enlaces.
4. Comprueba en **Productos** que están y que ninguno sale «Sin configurar» (INVENTORY-F05).
Entra: la plantilla (hub).
Sale: los productos, con su categoría fiscal, su stock y su umbral, y las categorías de la plantilla. La base de datos rechaza un stock o un umbral escrito sin la escala de cantidades (lo que dejó una plantilla mal exportada en agosto, inventory#42). Al volver a importar sobre un catálogo con los mismos SKU, el hub salta esos productos: no cambia su precio ni su stock.
Si falla: el hub aplica cada sección por separado: si la de Inventario falla, sale en el informe de la importación y el resto se aplica (lo pinta el hub).
Implicados: pendiente
Pendiente de enlazar: hub — importar una plantilla (blueprint) y su informe por secciones
QA: BD-01, qa-hub §4, qa-hub-restaurant §7.00
