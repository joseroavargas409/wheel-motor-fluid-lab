# Mecanismo, aceite y sondas: decisiones de integración

Revisión: 13 de octubre de 2026. GDY106 como referencia del modelo; GDY108 como comparación documental. Sin cotas OEM completas disponibles.

## Arquitectura respaldada

El [folleto oficial 930E-4SE, página 2](https://www.komatsu.com/content/dam/komatsu/websites/oceania/documents/brochures/dump-trucks/930e-4se.pdf) identifica GDY106 de inducción AC, reducción 32,62:1 y capacidad de servicio 95 L por caja. Diferencia freno húmedo de servicio y freno seco de estacionamiento sobre el extremo interior del rotor. La [patente GE US7455616B2](https://patents.google.com/patent/US7455616B2/en) describe doble reducción planetaria. No identifica dentados, cotas o sensores comerciales para una unidad GDY106 particular.

Por eso el aceite se mantiene en el reductor y no inunda el estator o el freno seco. La ventilación del motor se muestra como contexto geométrico, sin calcular aire de refrigeración. El circuito del freno de servicio no se confunde con el inventario de aceite de engranajes.

## Compatibilidad física y visual

El inspector original y V4.1 no tienen la misma geometría interna: centros axiales, radio del planetario de baja, dentado y portadores difieren. Esta integración conserva el ensamble detallado del inspector fuera del recinto y sustituye sus piezas dentro del recinto por las fronteras reales del solver. Una vista separada permite inspeccionar el ensamble original completo sin superponer fluido.

Los engranajes visibles se generan desde `result.json.geometry`, con cuatro segmentos por diente, profundidad de 14 mm y flancos lineales idénticos al criterio de sólidos del solver. El recinto es el cilindro cerrado de radio 0,5 m y longitud 0,9 m. La escena no añade pasadores, apoyos o tubos sólidos dentro de ese campo si no estuvieron presentes en el cálculo. Las sondas son marcadores no intrusivos, no electrodos físicos que desplacen aceite.

Cambio de base rígido: coordenadas del inspector `[X,Y,Z]` pasan a `[-X,Z+1.34,Y]` en el sistema SPH. Tiene determinante +1, conserva distancias y no escala las partículas. El eje del inspector pasa de Z a Y; la vertical de Y a Z. El centro de alta del inspector coincide con Y=+0,21 m del SPH. La baja se representa con el centro y radio del solver. Toda geometría de contexto del inspector en la vista integrada se recorta por Y≥0,451 m; no invade el recinto calculado.

En cada cuadro las partículas corresponden al índice exacto guardado, las piezas usan `mechanism_time_s` y las señales el mismo `time_s`. V4.1 prepara 3 s sin giro y 2 s con rampa antes de medir 20 s. La reproducción se detiene al terminar. Cambiar la velocidad de reproducción no recalcula rpm, presión o viscosidad.

## Cinemática

Con corona fija se cumple Willis: `(omega_s-omega_c) Ns + (omega_r-omega_c) Nr=0`, con `omega_r=0`. La primera etapa 18/27/72 reduce 5:1. La segunda 23/52/127 reduce 150/23:1. Total 750/23=32,60869565:1. A 300 rpm del rotor: 60 rpm en el portador de alta y 9,2 rpm en el de baja. Los satélites suman traslación orbital y giro propio; el campo de velocidad de frontera participa en el solver.

El perfil de dientes y el dentado son ilustrativos, no evolventes autenticadas. El movimiento es prescrito: no se resuelven contacto elástico, cargas, backlash, pérdidas o control del motor. La pared cilíndrica se mantiene fija; no se afirma que esa hipótesis reproduzca todos los componentes móviles del cubo real.

## Aceite y observación

Se reutilizan sin modificar los seis cálculos aceptados de los commits registrados en README. El motor V4.1 contiene viscosidad laminar SI, DFSPH con velocidad relativa de pared, contacto de flanco, tensión superficial de 0,030 N/m y adhesión empírica. Las trayectorias dependen de gravedad y fronteras. No se calculó una nueva simulación de la geometría original completa del inspector.

V4.1 usa sondas virtuales con exclusión de metal, kernel SPH, capacitancia coaxial, respuesta electrónica de 80 ms, ruido independiente y una ecuación auxiliar de película. Radio interior 4 mm, exterior 6 mm, longitud 25 mm; epsilon de aceite 2,2 y parásita 8 pF son supuestos. La separación de partículas es 32 mm y el soporte de muestreo 64 mm: el volumen sensible numérico es mucho mayor que el electrodo. No puede interpretarse como resolución real de un sensor de 25 mm. Película, conectividad y columna son estimaciones auxiliares.

V4 usa un proxy lineal distinto. Comparar sus pF con el coaxial de V4.1 no mide error físico. También difieren condiciones iniciales y ventanas. El tablero expone ambas versiones para trazabilidad; no las presenta como validación cruzada.

El aire mostrado es la fracción no ocupada por líquido en espacio libre de metal. No se resuelven cantidad de movimiento del gas, espuma o cavitación. El banco OpenFOAM de cizalla preservado es independiente y no valida las órbitas ni los dientes del reductor.

## Validación realizada

La verificación nueva comprueba integridad binaria de todos los cuadros, coincidencia SHA-256 de los motores y copias de origen, conservación de masa y partículas, valores finitos, contención, identidad de la transformación rígida, velocidades de piezas, superficies de dientes y fase común de piezas/partículas/sondas. Las señales se comprueban dentro de rangos o con estado no disponible explícito. La API verifica canales anidados, selección de versiones, exportaciones y entradas inválidas. Los informes de V4.1 son heredados y se conservan por separado del informe nuevo.

No se afirma exactitud por aprobar pruebas. El [benchmark de Murthy, Lippert y Beck (2025)](https://arxiv.org/abs/2511.00496) muestra que el acuerdo cualitativo de distribución puede coexistir con diferencias cuantitativas y exige comparación experimental. Aquí no hay mediciones de banco ni un estudio de convergencia aceptado del reductor completo.

## Para aumentar fidelidad cuantitativa

1. CAD de la variante, dientes y holguras medidos, compartimentos y paredes realmente móviles.
2. Curvas reales de rpm/torque, propiedades del aceite con temperatura y condición de operación.
3. Sensores comerciales: geometría, electrónica, calibración aire/aceite, película, temperatura y ruido.
4. Cálculo nuevo de geometría completa, estudio convergente de espacio/paso y balances de energía.
5. Banco con nivel estático, masa, distribución, capacitancia y temperatura; contraste de transitorios repetidos.

Hasta contar con esos datos, este proyecto representa redistribución macroscópica y observación local. No predice desgaste, RUL ni suficiencia de película del contacto.
