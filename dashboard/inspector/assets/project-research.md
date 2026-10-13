# Motor AC de rueda: investigación y decisiones V3

Fecha: 12 de octubre de 2026. Aplicación independiente de las simulaciones anteriores.

## Evidencia de fabricantes

- [Komatsu 930E-4SE, página oficial](https://www.komatsu.com/en-au/products/equipment/dump-trucks/electric-drive-mining-trucks/930e-4se): motor de inducción AC GDY106, reducción total 32,62:1 y 95 litros de aceite por caja reductora. El documento oficial distingue frenos de servicio multidisco refrigerados por aceite y freno de estacionamiento seco sobre el eje interior del rotor.
- [Ficha técnica oficial 930E-4SE](https://www.komatsu.jp/en/worldwide/PDF/KAC_930E-4SE.pdf) y [930E-4](https://www.komatsu.jp/en/worldwide/PDF/KAC_930E-4.pdf): referencias de arquitectura, capacidad y frenado. La descarga del PDF no respondió en la herramienta web durante esta iteración; los datos principales se corroboraron con la página oficial y la investigación preservada de V2.
- [Wabtec, sistemas de accionamiento eléctrico](https://www.wabteccorp.com/mining/electric-drive-systems): el sistema combina control, alternador, retardo dinámico y ruedas motorizadas. El conjunto de retardo disipa energía. Se representa una sola rueda; el alternador y la red de resistencias del camión quedan como conexiones externas.
- [Bel-Ray Synthetic Gear Oil](https://www.belray.com/product/synthetic-gear-oil/) y [ficha técnica del fabricante](https://www.belray.com/wp-content/uploads/2019/02/Synthetic-Gear-Oil.pdf): aceite VG 680 con valores típicos de viscosidad 683 cSt a 40 °C y 65 cSt a 100 °C, utilizados para la curva de Walther. No confundir con el aceite hidráulico de enfriamiento de los frenos.

## Modelos reproducibles

- [MathWorks, circuito equivalente de motor de inducción](https://www.mathworks.com/help/simscape-electrical/ref/simplifiedinductionmotor.html): referencia pública del deslizamiento, impedancias y relación par–velocidad. La implementación es propia en Python/NumPy, sin MATLAB. Se usa un circuito T por fase con rama magnetizante y rotor referido al estator; conexiones eléctricas balanceadas equivalentes en estrella. No se copian parámetros de un motor comercial.
- [SPlisHSPlasH, documentación del proyecto](https://splishsplash.readthedocs.io/en/latest/about.html): solver SPH abierto. Se conserva el motor nativo 2.18.1 de V2 con DFSPH y viscosidad implícita Weiler2018. Las posiciones y velocidades lineales/angulares de las fronteras se actualizan con la solución del motor.
- [SPlisHSPlasH 2.18.1, distribución oficial](https://pypi.org/project/pySPlisHSPlasH/2.18.1/): paquetes para Windows y Linux. La receta Linux usa Python 3.11; los binarios copiados para este PC corresponden a Python 3.13.

## Material aportado por el usuario

La revisión preservada del vídeo de mantenimiento y de la presentación pública [Motor AC Komatsu](https://es.scribd.com/document/424429639/Motor-AC-Komatsu) sirve para identificar estator, rotor de jaula, eje, grupos de alta/baja y frenos. La edición y la correspondencia exacta del manual no están autenticadas; no se extraen medidas OEM de sus esquemas. Se reutilizó la revisión de fotogramas técnicos realizada en V2; no se afirma haber transcrito las dos horas de narración.

La propuesta OA2IS, revisada en V1/V2, motiva las sondas S2/S5, temperatura, inclinación, aceleración y velocidad sincronizada. V3 muestra presencia local y contexto; no ofrece diagnóstico validado de fuga ni RUL. Los litros configurados son una condición del experimento y no una estimación a partir de sensores.

## Funcionamiento implementado

1. Un controlador ideal de frecuencia de deslizamiento recibe la consigna de rpm y regula la alimentación V/f. No reproduce el software de control del camión.
2. El circuito calcula corrientes fundamentales, potencia activa/reactiva, pérdidas de cobre y par electromagnético. El deslizamiento puede ser negativo durante el retardo.
3. La ODE J·dω/dt = Te − carga − frenos − amortiguamiento integra velocidad y ángulo. Se usan dos nodos térmicos, estator y rotor, con pérdidas y refrigeración aproximada.
4. Sol de alta → portaplanetas de alta/eje intermedio → sol de baja → portaplanetas de baja/cubo. Coronas fijas en esta topología ilustrativa.
5. Las fronteras SPH de engranajes, portaplanetas y ejes desplazan el aceite viscoso por contacto con las fronteras y gravedad. La reacción del aceite no se devuelve a la ODE del motor: acoplamiento en un sentido.
6. Sondas de aceite con ocupación local, respuesta temporal, ruido e histéresis; señales de corriente, par, velocidad y temperatura del motor. Las corrientes exportadas se muestrean con el paso eléctrico, suficiente para sus frecuencias fundamentales.

## Supuestos y límites que afectan la interpretación

| Elemento | Representación | Estado |
|---|---|---|
| Capacidad 930E-4SE | 95 L por reductor | Publicada por Komatsu |
| Reducción publicada | 32,62:1 | Publicada por Komatsu |
| Reducción geométrica V3 | Dientes alta 18/27/72, baja 16/36/88: 5 × 6,5 = 32,5 | Ilustrativa; diferencia −0,37 % |
| Dimensiones, portaplanetas y soportes | Geometría funcional aproximada | Sin CAD ni tolerancias OEM |
| Frontera del aceite | Cilindro cerrado fijo; cubo visual gira | Topología OEM pendiente de verificar |
| Motor | Tres pares de polos, 690 V/60 Hz, R/L, inercia y convección editables | Valores asumidos, sin calibración GDY106 |
| Barras/bobinas/rodamientos | Se representan completos en el despiece | Número y forma ilustrativos; sin contacto de elementos rodantes |
| Frenos | Par resistivo; freno seco de estacionamiento enclavado a baja velocidad | Sin circuito hidráulico ni CFD del aceite de freno |
| Aceite | Densidad 900 kg/m³; temperatura uniforme configurable | Densidad asumida; sin ecuación térmica del líquido |
| Superficie | Cohesión numérica Becker2007 | Coeficiente sin calibrar como tensión física en N/m |
| Aire | Espacio sin aceite inferido | No gas, burbujas, espuma ni cavitación resueltos |
| Resolución | Radio de partícula 20 mm por defecto | Splash macroscópico; no película lubricante ni contacto de dientes |
| Sensores | Transductores virtuales | Sin calibración comercial ni umbrales OEM |
| Montaje completo | Motor, reductores, soportes, cubo, frenos, sellos y enfriamiento | Cobertura funcional, no gemelo digital certificado |
| 980E-5SE | No ofrecido como el mismo motor | Requiere geometría y calibración GDY108D específicas |

Las comprobaciones numéricas confirman propiedades del cálculo implementado. No demuestran precisión contra el equipo real. Para validación hacen falta CAD autorizado, curvas de motor, ensayos de nivel/splash y datos reales de los sensores.
