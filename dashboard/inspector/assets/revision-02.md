# Wheel Motor · Revisión 02

13 de octubre de 2026. Reconstrucción representativa del GDY106. El visor conserva su enlace y acceso privado.

## Cambios

- Eje de entrada prolongado hasta el reductor exterior; spindle continuo y hueco con hombros.
- Rodamientos de cubo unidos a asientos radiales y apoyados sobre el spindle. Escudos del motor conectados a la carcasa y separados de las cabezas de bobina.
- 48 ranuras con 24 lazos de seis hilos. Rotor con ranuras inclinadas, 40 barras y anillos de cortocircuito; entrehierro visual aproximado de 4 mm.
- Etapa alta 18/27/72 y baja 23/52/127. Tres satélites por etapa, con fases de montaje compatibles. Relación ilustrativa 32,60869565:1, diferencia −0,03465 % frente al dato publicado de 32,62:1.
- Manguito intermedio hueco, conexiones radiales de los portadores, apoyos de satélites, arandelas de empuje y retenedor de tapa.
- Disco seco ligado al rotor; discos húmedos ligados al cubo, separadores y pistón fijos. Tornillos siguen a sus conjuntos durante el despiece.
- Captador de velocidad frente a una rueda de 192 dientes. Cantidad tomada de una lámina de capacitación de variante indeterminada; no autentica la unidad GDY106.
- Vistas por sistema e inspector con extensiones geométricas aproximadas. Transparencia de portadores para ver los engranajes.

## Fuentes contrastadas

Se revisaron i1.jfif, i2.png, los tres clips aportados y el seminario de mantenimiento EVvYz-qH9VE preservado en el proyecto. Del seminario se revisaron las muestras V2 y 29 fotogramas adicionales, con muestreo cada minuto entre 00:12 y 00:30 y puntos de sensor/rodamientos posteriores. No se realizó una revisión continua ni transcripción completa de 132 minutos de audio.

La investigación local V2, V3, V4 y V4.1 se contrastó con la [ficha Komatsu 930E-4SE](https://www.komatsu.com/en-au/products/equipment/dump-trucks/electric-drive-mining-trucks/930e-4se), las [FIG. 2 y 3 de la patente GE US7455616B2](https://patents.google.com/patent/US7455616B2/en), el [material de capacitación Motor AC Komatsu](https://es.scribd.com/document/424429639/Motor-AC-Komatsu) y el [extracto GEK-91680A](https://www.scribd.com/document/721675202/GEK-91680A-ServiceManual-Dimension). Los ajustes de apoyo del extracto orientan las proporciones; no se toman medidas sobre pasadores como diámetros primitivos. La edición del extracto no fue autenticada.

El video ferroviario CTRB aporta forma didáctica de aros, rodillos y jaulas; no identifica el tipo de rodamiento del motor. No se incorporó el CAD de transmisión automática genérica del trabajo anterior. La carpeta sincronizada sources estaba vacía al comenzar esta iteración; no se modificó.

## Uso y alcance

Arrastra para girar; rueda para acercar; Mayús y arrastre para desplazar. La lista permite mostrar, ocultar, seleccionar y aislar componentes. Cambia de sistema, ajusta transparencia o despiece y utiliza cortes X/Y/Z. Las posiciones de despiece no son un procedimiento de mantenimiento. El recorte no rellena las superficies abiertas.

Descargar GLB guarda geometría, materiales, visibilidad y pose actuales; no exporta el plano de corte ni una animación temporal. La captura PNG incluye el render, sin paneles. Para la copia local, sirve dist con HTTP; con Node.js ejecuta node server.mjs y abre http://127.0.0.1:8846/.

La representación tiene 32 conjuntos y aproximadamente 2.060 elementos geométricos; el conteo incluye detalles visuales y contexto opcional, y no es una lista de materiales OEM. Dimensiones, dentados, ranuras, apoyos y cantidades son aproximados. No se resuelven contacto elástico, tolerancias, electromagnetismo, aceite, cargas ni diagnóstico.

Las comprobaciones verifican coordenadas finitas, fases uniformes de satélites, ecuación de Willis, velocidad de contacto en círculos primitivos y algunas separaciones radiales/axiales obtenidas de las geometrías. No constituyen una comprobación exhaustiva de interferencias ni validación OEM. El GLB se comprueba como binario glTF 2.0. Three.js conserva su licencia MIT en dist/vendor/LICENSE-three.txt.
