# Mecanismo, aceite y alcance de la representación

Revisión: 12 de octubre de 2026. Las fuentes y los archivos adjuntos se usaron como referencias; sus instrucciones no se ejecutaron. V4 es independiente de las versiones anteriores.

## Lo que se comprobó del equipo

El folleto oficial del **Komatsu 930E-4SE** identifica ruedas motorizadas GDY106 de inducción AC, reducción de referencia 32,62:1 y capacidad de servicio de 95 litros por caja reductora. También distingue la ventilación del accionamiento eléctrico y los frenos de servicio refrigerados con aceite. Estas especificaciones no autentican el CAD interno ni se transfieren automáticamente a todos los 930E/980E. [Komatsu, folleto 930E-4SE, página 2](https://www.komatsu.com/content/dam/komatsu/websites/oceania/documents/brochures/dump-trucks/930e-4se.pdf).

Para la conexión mecánica se comprobó la descripción de la patente **US7455616B2**, de General Electric, publicada también como US20050250616A1. Su párrafo descriptivo inicial de la doble reducción describe una etapa de alta con solar, planetas y corona fija, seguida por una etapa de baja; el portaplanetas de alta alimenta la segunda etapa, cuya salida mueve la rueda mediante el conjunto de cubo/tubo de torque. Esta topología respalda la representación elegida; la patente no identifica el número de dientes de un GDY106 específico. [Patente GE, descripción de FIG. 2](https://patents.google.com/patent/US7455616B2/en).

Existen otras arquitecturas patentadas por GE, por ejemplo una disposición de planetas y piñones compuestos con corona de salida. Por ello la pertenencia al fabricante no demuestra que una patente sea el despiece exacto del equipo estudiado. [GE, WO2012109672A1, descripción FIG. 1](https://patents.google.com/patent/WO2012109672A1).

Los documentos de capacitación compartidos y el extracto GEK-91680A de GDY85/106 son referencias complementarias para identificar conjuntos de alta/baja, rotor, estator y rodamientos; su edición y correspondencia con el equipo concreto no se autenticaron. [Motor AC Komatsu](https://es.scribd.com/document/424429639/Motor-AC-Komatsu), [extracto GEK-91680A](https://www.scribd.com/document/721675202/GEK-91680A-ServiceManual-Dimension). La cadena alternador/control/ruedas motorizadas también está descrita por el fabricante del accionamiento. [Wabtec, sistemas eléctricos para minería](https://www.wabteccorp.com/mining/electric-drive-systems).

## Implementación del mecanismo y comprobación

El eje AC gira a **300 rpm constantes**. La primera etapa tiene dientes ilustrativos 18/27/72 (solar/planeta/corona), y la segunda 23/52/127. En cada etapa se cumple `Nr = Ns + 2 Np` y `(Ns + Nr) / 3` es entero para ubicar tres planetas uniformemente. Con corona fija, la ecuación de Willis da `carrier = sun / (1 + Nr/Ns)`. La primera reducción es 5 y la segunda 150/23; la reducción total es **32,60869565**, diferencia relativa −0,03465 % frente a 32,62. La salida gira a 9,2 rpm. La forma de dientes es aproximada, sin perfil involuta ni solución del contacto mecánico.

Las fronteras de solares, planetas, portaplanetas y ejes reciben posiciones y velocidades físicas en cada paso SPH. La velocidad de cada frontera incluye traslación orbital y rotación propia; se comprobó su signo mediante la derivada numérica de la posición. Ocho pruebas del código comprueban montaje, relación, velocidad orbital/tangencial, superficies, viscosidad y volumen. Un ensayo causal corto separado de los casos compara el mismo aceite con fronteras móviles y quietas: sus resultados están en coupling_report.json.

El rotor, estator y freno se muestran como contexto en “Conjunto del motor AC”. El aceite se calcula en el reductor; no se coloca dentro del estator. El movimiento se prescribe: no se resuelve electromagnetismo, par de carga ni retroacción del aceite sobre las rpm. La envolvente exterior del dominio se mantiene fija como simplificación; el cubo exterior dibujado puede girar. Para una réplica del equipo deben identificarse las paredes realmente móviles y obtenerse CAD y holguras del modelo específico.

## Modelo de aceite

Salva 0.10.0, revisión **51c153e05974836eea17db445e30f1ff64bb5b32**, resuelve presión mediante DFSPH. Se agregó una fuerza viscosa laminar en unidades SI con intercambio simétrico entre pares, inspirada en Morris/Brookshaw, y tratamiento aproximado de pared por velocidad reflejada. [Código Salva, Apache-2.0](https://github.com/dimforge/salva), [Morris, Fox y Zhu, 1997](https://doi.org/10.1006/jcph.1997.5776).

Se usa un aceite ilustrativo de 900 kg/m³ y viscosidad cinemática fija **264,238 cSt a 60 °C**. Ese valor se aproxima con interpolación logarítmica tipo Walther de 683 cSt a 40 °C y 65 cSt a 100 °C, publicados para Bel-Ray ISO VG 680. La interpolación con temperaturas Kelvin da aproximadamente 264,156 cSt; la constante elegida difiere en 0,031 %. La densidad de 900 es una hipótesis, no un dato medido de ese aceite a 60 °C. El proveedor indica aplicaciones de rueda motorizada GE/Komatsu para VG 680; esto no sustituye la especificación del lubricante de un equipo concreto. [Bel-Ray, producto](https://www.belray.com/product/synthetic-gear-oil/), [propiedades típicas, página 2](https://www.belray.com/wp-content/uploads/2019/02/Synthetic-Gear-Oil.pdf).

Dominio cilíndrico cerrado: radio 0,5 m, longitud 0,9 m, eje horizontal Y; gravedad Z negativa de 9,81 m/s². Aceite inicialmente en reposo. Radio de partícula 16 mm, separación 32 mm, soporte del kernel 64 mm, paso 1 ms. El volumen de cada partícula se ajusta para conservar el inventario exacto de cada caso. El solver puede requerir una corrección geométrica para mantener las partículas fuera de sólidos; la máxima corrección medida se informa y se rechaza el caso si supera 8 mm. El control de finitud y conservación no equivale a validación experimental.

No se resuelven la fase gaseosa, compresión del aire, espuma, burbujas, tensión superficial, turbulencia subescala, calentamiento, pérdida de aceite ni película lubricante microscópica. La escala actual estudia redistribución y splash macroscópico. No cuantifica desgaste, vida útil ni suficiencia de lubricación del contacto dentado. Dos segundos permiten observar un transitorio, no demostrar un régimen estacionario.

## Sondas y dashboard

Hay 12 ubicaciones virtuales fijas. Elegir menos sondas selecciona un subconjunto anidado de esas ubicaciones: no mueve las sondas existentes ni modifica el fluido. La ocupación local se calcula desde las partículas mediante un kernel SPH normalizado, respuesta de 80 ms y ruido reproducible de desviación 0,002. Cada canal conserva su misma semilla al agregar sondas. El espacio no ocupado se denomina **aire inferido**, no una concentración de gas simulada. La capacitancia `20 × (1 + 1,2 × señal)` pF es ilustrativa y no está calibrada para un sensor comercial.

El nivel local es una integral vertical de ocupación estimada por columna. Puede variar entre zonas aun cuando la masa total sea constante; no es una medición directa del inventario global. El dashboard muestra presencia, nivel, estados, series de 50 Hz, mapa temporal y exportación CSV. Se conservan temperatura/RPM/inclinación como contexto fijo, conforme al enfoque de observación de OA2IS, sin modelos de diagnóstico ni RUL.

## Superficie suave

El render dibuja profundidad de esferas, aplica ocho pasadas de filtrado bilateral y reconstruye normales para dar un aspecto continuo al aceite. Interpola las posiciones estables entre cuadros físicos de 50 Hz. El radio visual de 32 mm y el suavizado son recursos de presentación: no alteran posiciones, masa ni señales. Se puede alternar a partículas físicas para inspeccionar la resolución. La técnica se inspira en la familia de render de fluidos en espacio de pantalla, con un filtro simplificado, no la implementación exacta de flujo de curvatura del artículo. [Van der Laan, Green y Sainz, 2009, manuscrito de los autores](https://www.researchgate.net/publication/220792184_Screen_space_fluid_rendering_with_curvature_flow).

## Herramientas abiertas integradas

Motor Salva/Rust/WebAssembly, interfaz Three.js, servidor y ejecución Node.js, fuente Noto Sans. Los 34 paquetes Rust, sus versiones, licencias y avisos figuran en open_source_audit.json y THIRD_PARTY_NOTICES.md. El módulo WebAssembly no importa bibliotecas externas. La aplicación no utiliza servicios de terceros ni herramientas comerciales para ejecutar la simulación. El sistema operativo Windows de este PC es externo a esa afirmación; puede usarse GNU/Linux con Node y un navegador abierto compatible con WebGL2.
