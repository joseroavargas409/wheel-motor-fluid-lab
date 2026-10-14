# Iteración 02: mecanismo visible, fluido conservado

14 de octubre de 2026. Versión del laboratorio 1.1.0.

## Resultado

Se recuperó la estructura exterior del inspector en toda la longitud del reductor: cubo de rueda, uniones, soporte fijo y carcasa. El cubo y sus bandas siguen las velocidades prescritas del inspector (9,2 rpm); la reacción de las coronas permanece fija. La transmisión de alta y baja mantiene la geometría física de V4/V4.1 dentro del compartimento calculado.

Antes se descartaba todo el contexto del inspector con Y<0,451 m. Ese plano quitaba el cubo, aunque estuviera fuera del volumen de aceite. Ahora se elimina únicamente el contexto dentro de un cilindro de protección de radio 0,501 m y semilongitud 0,451 m. Las piezas exteriores pueden conservarse a cualquier altura axial. Las piezas originales de los dos planetarios no se duplican en la vista integrada.

Las coordenadas de este recorte son globales y se actualizan con cada transformación del objeto. El margen de 1 mm protege el dominio de radio 0,5 m y longitud 0,9 m usado por el cálculo. No se añaden nuevos sólidos al dominio SPH.

## Inspección del mecanismo

- Corte de carcasa por un cuadrante, transparencia o exterior sólido. El corte cambia la vista; el recinto físico y el aceite permanecen cerrados en el cálculo.
- Alta en tonos dorados y baja en azules, con marcas de orientación sobre las caras existentes del metal.
- Selección de cada solar, satélite, corona, portaplanetas y acoplamiento. Los tres pasos de la transmisión son seleccionables.
- Giro propio, órbita y orientación instantánea derivados de las fronteras guardadas y de `mechanism_time_s`.
- Satélites de alta: giro propio aproximadamente −100 rpm y órbita +60 rpm. La orientación respecto del portador es la diferencia entre ambos; no se confunde con el giro absoluto.
- Primera salida 60 rpm; solar de baja 60 rpm; salida final 9,2 rpm. Coronas fijas: 0 rpm.
- Rótulos 3D de alta, baja y cubo, con posibilidad de ocultarlos.

La topología de doble reducción se conserva como referencia de la [patente GE US7455616B2](https://patents.google.com/patent/US7455616B2/en). El [folleto Komatsu 930E-4SE](https://www.komatsu.com/content/dam/komatsu/websites/oceania/documents/brochures/dump-trucks/930e-4se.pdf) sustenta el contexto GDY106 y la reducción publicada, sin autenticar las cotas internas de esta reconstrucción.

## Fluido preservado

No se recalculó el aceite ni se cambió el motor físico. Los seis campos completos, sus señales, los dos motores WASM y el ensamble de origen se verificaron contra los 23 hashes guardados antes de esta iteración. Masa, duración, posición de sondas, capacitancia y CSV se conservan. La superficie suave y las partículas siguen representando los mismos cuadros físicos.

La envolvente interior SPH permanece fija aunque el cubo exterior se muestre girando. Esta simplificación preexistente sigue declarada; esta iteración no equivale a recalcular la interacción del aceite con una pared móvil OEM. Tampoco se añaden pasadores o rodamientos físicos al campo sin recalcular las trayectorias.

## Comprobaciones

`npm test` ejecuta las 43 comprobaciones de datos/geometría y siete comprobaciones nuevas: retención del cubo exterior, exclusión de todo el campo de partículas, velocidades de coronas/portadores/satélites, cadena de transmisión, lectura angular y recorte de materiales. También verifica los hashes originales. `npm run test:api` conserva diez comprobaciones de servicio y exportación.

Informes: `reports/lab-verification.json`, `reports/mechanism-verification.json`, `reports/lab-api-verification.json` y revisión visual de esta versión. Estas pruebas verifican la integración y la preservación, sin certificar precisión OEM o experimental.
