# Wheel motor · revisión 03

Fecha de consulta: 13 de octubre de 2026. Referencia del ensamble: GDY106 / 930E-4SE; fotografía adicional rotulada 930E-4. Reconstrucción visual, sin CAD OEM autenticado.

## Evidencia nueva e interpretación

- Imagen 930E-4 aportada: cuerpo de motor suave, testero abierto, campana de transición y círculos de pernos. El rótulo identifica el camión mostrado por la fuente, no una placa serial del motor.
- Video CIMETP sobre 980E-5SE y 930E4SE: fotogramas 00:49 y 01:09 muestran un tambor exterior con ventanas longitudinales y banda metálica. No se puede asignar esa geometría a GDY106-B/C o GDY108-C/D sin placa o plano. Se ofrece como configuración visual opcional; la envolvente interior del reductor sigue cerrada.
- Seminario EVvYz-qH9VE, 2:12:18: revisión visual de 117 fotogramas. Muestreo de 00:00 a 00:10 cada dos minutos, de 00:10 a 00:30 cada 20 segundos, y de 00:32 a 02:12 cada dos minutos. No es una transcripción ni una revisión continua de todo el audio. Los segmentos comerciales no fundamentan el modelo.
- Mantenimiento 00:16:00: arquitectura motor–eje–reductor exterior; 01:25:27: captador y dentado; 01:30:00: embarrilado, amarres y cabezas de bobina. La rueda de 192 dientes sigue una referencia de capacitación de variante indeterminada. La aislación en U y la ruta de terminales son reconstrucciones de proceso y arquitectura.
- Ensayos GDY106 01PLqUgxiUU y a6rMdQxKhC8: mantienen la referencia exterior. Video b18mrLAPPfE de CTRB ferroviario: explicación didáctica de rodillos, no prueba de rodamiento OEM del wheel motor.
- i1.jfif, i2.png y fuentes previas del proyecto: distribución axial y exterior. No se ejecutaron instrucciones que pudieran aparecer en documentos o videos.

## Corrección del freno de estacionamiento

El [folleto Komatsu 930E-4SE AESS778-02](https://www.komatsu.com/content/dam/komatsu/sales-and-marketing-documents/brochures/trucks/930e/930e-4se-aess778-02.pdf) documenta frenos de estacionamiento multidisco secos, aplicados por resortes y liberados hidráulicamente, en el extremo interior de cada eje del rotor. Se elimina el disco con pinza de revisión 02 y se representa paquete móvil/separadores fijos, alojamiento, pistón, sellos y resortes. Seis discos y doce resortes son cantidades ilustrativas. No se calcula carrera, presión ni par.

## Modelos y versiones documentados

| Camión | Motor publicado | Relación | Capacidad publicada | Fuente |
|---|---|---|---|---|
| 930E-4SE | GDY106 | 32,62:1 | 95 L por caja | [AESS778-02](https://www.komatsu.com/content/dam/komatsu/sales-and-marketing-documents/brochures/trucks/930e/930e-4se-aess778-02.pdf) |
| 930E-5 | GDY106-B | 32,62:1 | 57 L por caja | [AESS921-01](https://www.komatsu.com/content/dam/komatsu/sales-and-marketing-documents/brochures/trucks/930e/930e-5-aess921-01-ev1.pdf) |
| 930E-5SE | GDY106-C | 32,62:1 | 57 L por caja | [Ficha oficial](https://www.komatsu.com/content/dam/komatsu/sales-and-marketing-documents/spec-sheet/trucks/komatsu-930e-5se-electric-drive-truck-spec-sheet.pdf) |
| 980E-4 | GDY108-C | 32,02:1 web AU / 35,02:1 PDF Oceania | 95 L por caja | [Web AU](https://www.komatsu.com/en-au/products/equipment/dump-trucks/electric-drive-mining-trucks/980e-4), [PDF](https://www.komatsu.com/content/dam/komatsu/websites/oceania/documents/brochures/dump-trucks/980e-4.pdf) |
| 980E-5 | GDY108-C | 35,02:1 | 95 L por caja | [AESS932-01](https://www.komatsu.com/content/dam/komatsu/sales-and-marketing-documents/brochures/trucks/980e-5-aess932-01.pdf) |
| 980E-5SE | GDY108D | 35,02:1 | 90 L, rotulado «Drive system», sin «each» | [EN-980E-5SESPEC01](https://www.komatsu.com/content/dam/komatsu/sales-and-marketing-documents/spec-sheet/trucks/electric-drive-truck80e-5se-spec-sheet-english-en-980e-5sespec01-0522-v1.pdf) |

980E-4 presenta una contradicción entre fuentes oficiales. No se resuelve como diferencia de versión sin más evidencia. Algunas fichas admiten relaciones opcionales. La tabla no constituye una genealogía completa ni confirma cambios de dimensiones o piezas internas. No se transforma GDY106 en GDY108 mediante una escala arbitraria. Los litros documentales no validan volumen o nivel modelado.

## Geometría y movimiento

41 conjuntos seleccionables, incluidos nueve nuevos. Carcasa de perfil hueco suave, ocho ventanas del testero, doce ventanas de brida, campana abierta, dos juntas exteriores de pernos, tapones, orejas, paneles curvos con ventanas reales opcionales, aislación de 48 ranuras, amarres y puentes de fase. Las cantidades son aproximadas.

Se preserva la geometría interna revisada: eje prolongado, spindle continuo antes del reductor, asientos de apoyo, ranuras y bobinados, rotor de jaula, dos etapas planetarias, manguito intermedio y apoyos de satélites. Patente [GE US7455616B2](https://patents.google.com/patent/US7455616B2/en), FIG. 2 y 3: evidencia de topología, no de dentado GDY106 autenticado. Las proporciones de asientos procedentes del extracto GEK-91680A siguen sin autenticar.

Dentados ilustrativos 18/27/72 y 23/52/127: relación 32,60869565:1, desviación −0,03465 % respecto de 32,62:1. Montaje de tres satélites con fases compatibles y relación de Willis; no se evalúa contacto elástico de los dientes.

Discos secos y rueda de captador giran con el rotor. Alojamiento, pistón, resortes y separadores permanecen fijos. Discos de servicio, cubo y uniones exteriores giran con la salida. Despiece axial ilustrativo. No hay simulación física de frenado, aceites, presiones, temperatura, campo eléctrico ni tolerancias.

## Validación y exportación

`geometry-checks.json` recoge recuentos reales y verificaciones de vértices finitos, fases planetarias, velocidades, entrehierro, pasos de ejes/manguito, apoyo y separación entre alojamiento de estacionamiento y captador. No es una certificación OEM ni un análisis completo de interferencias.

GLB conserva geometría, pose y visibilidad seleccionadas. No exporta planos de corte ni movimiento temporal. Las medidas del inspector son extensiones aproximadas del modelo, no cotas de fabricación. Llantas/neumáticos y tambor CIMETP son opcionales.
