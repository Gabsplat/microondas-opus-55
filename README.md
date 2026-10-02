# Dentro del microondas — cuaderno de ingeniería

Experiencia interactiva que explica el interior de un horno de microondas como un cuaderno de ingeniería dibujado en grafito. Canvas 2D y JavaScript puros: sin librerías de dibujo ni de animación, sin imágenes externas ni fuentes remotas. Los diagramas, el papel, el grafito y el movimiento se generan con código. HTML y CSS sólo dan los controles accesibles y las notas.

## Uso

```sh
pnpm start      # servidor estático en 127.0.0.1:4380 (variable PORT para cambiarlo)
pnpm test       # pruebas de interacción con Playwright (servidor encendido; URL=... para otra dirección)
pnpm shot 2 3800,15000   # capturas de control: escena, tiempos en ms, [ancho alto]
```

Usa módulos ES: hay que servirlo por HTTP; abrirlo como archivo local no funciona.

Vista previa temporal: unidad de usuario transitoria `microondas-opus55-preview.service`, en loopback 4380 y publicada sólo en la tailnet en `https://omarchy.tailff08b5.ts.net:29443`. Para retirarla: `systemctl --user stop microondas-opus55-preview` y `tailscale serve --https=29443 off`.

## Recorrido

Cada capítulo tiene su propio reloj y su coreografía (preparación → dibujo → descubrimiento → demostración → reposo). Nunca se pasa de diapositiva sola: se avanza a mano. Cada sección conserva su reproducción (tiempo, pausa y selección) al salir y volver; las que no se ven quedan suspendidas.

- **01 El mapa.** El horno cerrado se dibuja y la carcasa se separa (anticipación, elevación lenta). La puerta gira sobre su bisagra. Las piezas se dibujan y se separan de a una a lo largo de guías azules. Hay un recorrido con una etiqueta por vez. Al tocar una pieza (o su botón), la cámara la acerca y la nota explica su trabajo en una frase.
- **02 De electricidad a microondas.** Primero aparecen los bloques: enchufe, control, transformador, condensador + diodo, magnetrón y guía. La corriente va y viene antes del duplicador y pulsa en un solo sentido después. Una frontera separa el circuito eléctrico del recorrido de radiofrecuencia. Cada bloque revela su detalle al explorarlo. El magnetrón se abre en un corte conceptual con cátodo, ánodo de cobre, cavidades resonantes, campo magnético, rayos de electrones que giran, cargas que oscilan y antena. Los electrones nunca salen del magnetrón. Un selector compara la arquitectura convencional con la inverter, incluida la potencia media por ciclos o continua.
- **03 El viaje invisible.** Es un corte lateral del horno. La cámara entra por la antena, recorre la guía con el campo oscilando a lo largo del tubo, toma un respiro y se zambulle en la boca de la guía. Allí vive otro dibujo, el interior de la cavidad en perspectiva. Los frentes de onda se expanden y se reflejan en las paredes. Luego queda un patrón cualitativo de zonas fuertes y débiles, separadas unos 6 cm. Una taza arrastrable (o dos controles deslizantes) y un indicador de aguja muestran cómo varía según la posición.
- **04 Qué le pasa al alimento.** Del plato se pasa a un pedacito de comida y a un mundo molecular, con moléculas de agua (δ+/δ−) que giran con un campo alterno lento y retrasado. La agitación se dibuja con trazos cálidos y una barra cualitativa muestra la energía absorbida. Al volver al plato aparecen las zonas del campo y el calentamiento desigual. El plato se desdobla en la comparación interactiva «plato quieto / plato girando». La energía absorbida se acumula en coordenadas de la comida sobre el mismo patrón, con giro comprimido. Se puede repetir y mostrar u ocultar las zonas.
- **05 La puerta también trabaja.** Una lupa sobre la malla muestra la puerta en corte. La microonda de 12 cm se refleja en la lámina perforada y la luz visible pasa hasta el ojo. Por separado, un esquema de enclavamientos muestra fusible, primario, secundario y monitor, con estado opuesto, además del canto de la puerta con ganchos y un indicador de RF. Al abrir, primero se libera el pestillo, se abren los contactos y la RF se detiene; recién después se separa la puerta. Al cerrar, el horno no vuelve a emitir hasta que se lo encienda de nuevo.
- **Final: todo estaba conectado.** La cámara se aleja desde la puerta y cada panel se vuelve a dibujar en una sola lámina: mapa, diagrama eléctrico, corte del magnetrón, cavidad, moléculas, platos y puerta. Las líneas guía nombran sus relaciones y hay un rótulo de lámina. «Ver el ciclo completo» recorre seis pasos con trazos cálidos: cerrar la puerta, activar la alimentación, generar RF, conducirla a la cavidad, absorber energía y detener la generación. Después vuelve a la composición quieta. Al tocar un panel se acerca y luego se puede abrir su capítulo.

Las transiciones entre capítulos usan la lámina saliente: anticipa, acelera hacia la pieza que conecta con la siguiente idea y la nueva nace desde ese punto. Volver atrás invierte la escala.

## Controles

- Anterior/Siguiente, capítulos 01–05 y Final, `#mapa`, `#energia`, `#viaje`, `#alimento`, `#puerta`, `#final`.
- Teclado: ← → (también RePág/AvPág), Inicio/Fin, 1–6, espacio (pausa), R (repetir), C (completa), + / − (zoom), 0 o Esc (volver a encuadrar).
- Táctil: deslizar en horizontal cambia de capítulo; con zoom, arrastrar desplaza; dos dedos amplían.
- Pausar/Continuar, Repetir, Completa (salta al reposo), Ampliar, Encuadrar, rueda del mouse.
- PNG: exporta la sección actual tal como se ve, o la lámina final completa (2400 × 1600, con rótulo y nota).
- `prefers-reduced-motion`: cada capítulo abre completo y quieto, sin transiciones; Continuar o Repetir reproducen a pedido.
- Pestaña oculta o lienzo fuera de pantalla: el bucle se detiene. Sin cambios, tampoco se redibuja.

## Grafito

Cada trazo se remuestrea a lo largo de su recorrido. La presión varía con ruido determinista y afinamiento en los extremos. Hay hasta cuatro hebras desplazadas, pequeñas interrupciones y un pulso de mano. Se agrupa por nivel de presión en una sola pasada. El rayado sigue el volumen: une bordes opuestos en perspectiva, sigue generatrices en cilindros y contornos en platos. El papel tiene manchas en baja resolución, fibras y motas con semilla fija. El diente del papel come una parte del grafito con la misma textura en cada cuadro. Las piezas se tapan entre sí borrando grafito, no pintando encima. Guías en azul tenue; el acento cálido se reserva para la energía absorbida.

Las curvas de trazado son monótonas: una línea dibujada nunca retrocede. El sobrepaso y la anticipación se usan sólo en movimientos de objetos y de cámara. Las etiquetas se escriben después de la forma, evitan solaparse y no salen de la hoja.

## Precisión y límites

- Todo es ilustración conceptual. La disposición de piezas varía según el modelo; el circuito es un diagrama de bloques, no un plano de cableado.
- Tiempos didácticos: el campo, las moléculas, los electrones y la corriente van muchísimo más lento que en la realidad (2,45 GHz; el campo cambia de sentido unas 4.900 millones de veces por segundo). El giro del plato está comprimido.
- El patrón de campo es una mezcla cualitativa de dos modos con separación del orden de media longitud de onda (≈ 6 cm para λ ≈ 12,2 cm). No es una solución electromagnética. Los platos muestran energía absorbida relativa, sin temperaturas.
- Arquitectura convencional (transformador, condensador, diodo; potencia por ciclos). La inverter se presenta aparte.
- Un horno real no funciona abierto ni debe desarmarse: el condensador puede conservar carga peligrosa.

Fuentes (también en el desplegable «Fuentes y alcance»): [FDA — Microwave Ovens](https://www.fda.gov/radiation-emitting-products/resources-you-radiation-emitting-products/microwave-ovens), [21 CFR 1030.10](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-J/part-1030/section-1030.10), [Vollmer (2004), *Physics of the microwave oven*, Phys. Educ. 39](https://doi.org/10.1088/0031-9120/39/1/006), [Collins (1948), *Microwave Magnetrons*](https://history.aip.org/catalog/books/21201.html), [USPTO — puerta con panel transparente blindado](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10531524), [GE Appliances — despiece](https://www.geapplianceparts.com/store/parts/ModelSectionParts/JE1590SH01/1/0/0/0/MICROWAVE), [Panasonic — inverter](https://www.panasonic.com/uk/consumer/home-appliances-learn/home-appliances/inverter-technology-the-new-way-of-cooking.html), [NC State — calentamiento dieléctrico](https://repository.lib.ncsu.edu/server/api/core/bitstreams/0eebf3ff-611f-4e9a-9294-0c6e971a2ef6/content).

## Estructura

- `index.html`, `css/app.css`: notas, controles y accesibilidad.
- `js/core.js`: azar con semilla, ruido, easing, proyección caballera y encuadres.
- `js/pencil.js`: trazo de grafito, rayado, texto manuscrito, papel y diente.
- `js/render.js`: cuadro de dibujo con cámara, mundos anidados, etiquetas y zonas táctiles.
- `js/app.js`: bucle, cámara, transiciones, navegación, gestos y exportación.
- `js/scenes/*.js`: un archivo por capítulo; `field.js` comparte el patrón de campo y la homografía del piso.
- `scripts/`: pruebas, capturas y medición de rendimiento con Playwright.
