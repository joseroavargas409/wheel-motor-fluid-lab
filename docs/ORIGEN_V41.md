# OA2IS V4.1 independiente — aceite, mecanismo y sondas

## Memoria del desarrollo

[Qué se realizó, cómo se implementó, herramientas y fuentes](docs/INFORME_DESARROLLO.md). Incluye resultados, comprobaciones, supuestos, límites y enlaces al código. Documentación añadida el 13 de octubre de 2026.

Se creó desde una copia verificada de V4. Todos los cambios y ensayos nuevos están en esta carpeta. V4 y las versiones anteriores se conservan.

## Abrir

Ejecutar **INICIAR_V41.ps1** y abrir **http://127.0.0.1:8772/?oil=95&sensors=6**. Presionar Reproducir. V4 continúa usando su propio puerto 8771. El archivo INICIAR_V4.ps1 en esta copia es histórico: utilizar INICIAR_V41.ps1.

Solo se varían los litros de aceite (30–145 L) y la cantidad de sondas (2–12). Cámara, velocidad de reproducción y aspecto cambian la presentación. Los casos guardados no vuelven a calcularse al cambiar la cantidad de sondas.

## Casos calculados

| Aceite | Partículas | Masa | Duración medida | Sondas disponibles |
|---|---:|---:|---:|---|
| 55 L | 2098 | 49,5 kg | 20 s | 2–12 |
| 95 L | 3624 | 85,5 kg | 20 s | 2–12 |
| 125 L | 4768 | 112,5 kg | 20 s | 2–12 |

Cada cálculo incluye antes 3 s de asentamiento sin giro y 2 s de arranque gradual. La ventana del dashboard comienza después de esa preparación. Durante los 20 s de medición, el mecanismo gira a 300 rpm, el aceite está a 60 °C, rho = 900 kg/m³, nu = 264,238 cSt, gravedad = 9,81 m/s², sin inclinación ni aceleración adicional. Los valores son supuestos del estudio. No se han medido en un motor OEM.

Los tres casos conservaron la masa y las partículas, permanecieron dentro del recinto, no conservaron centros dentro del metal y superaron límites de velocidad/corrección. Correcciones máximas: 0,556 / 0,813 / 0,974 mm. Estos controles no prueban exactitud física ni sustituyen una validación de banco. Los cálculos simultáneos tardaron aproximadamente 32–44 minutos en este PC; un volumen nuevo requiere tiempo de cálculo.

## Cambios respecto a V4

- Corrección de divergencia usando velocidad relativa entre fluido y pared móvil.
- Contacto con la cara más cercana del diente, incluyendo su flanco y normal.
- Viscosidad física, fuerza de tensión superficial y adhesión empírica de pared.
- Asentamiento y rampa, tiempos precisos y sincronización de fase entre mecanismo y partículas.
- Sensibilidad de sonda con exclusión de metal; capacitancia coaxial analítica, película residual auxiliar, respuesta de 80 ms y ruido independiente.
- Señales de ocupación aceite/aire inferido, conectividad con el fondo, película, capacitancia, estado y columna local; CSV y gráficos de 20 s.
- Superficie visual suave y posibilidad de revisar partículas físicas.
- Estudios de refinamiento y una referencia OpenFOAM independiente, con estado de validación explícito.

La separación estable usada es 32 mm (radio 16 mm). El ensayo de 16 mm presentó picos y correcciones excesivas durante el arranque; no está aceptado como nueva resolución base. El estudio inicial de 8 mm es corto y no demuestra convergencia. Ver reports y research/v41.md.

## Aceite, aire y sensores

SPH calcula el aceite con paredes y gravedad; el aire de esa vista es inferido. La película de la sonda es una ecuación auxiliar, no película micrométrica resuelta. La conectividad es una aproximación que depende de resolución. La columna local no es una lectura comercial de nivel global. La capacitancia usa geometría coaxial, epsilon del aceite supuesta y capacitancia parásita supuesta; falta calibrarla contra sensores reales.

La referencia OpenFOAM entregada es un banco 3D de cizalla con una pared móvil plana, aproximación local a una cara del mecanismo. Calculó 3 s (1 s de preparación y 2 s de medición), con 95 L de aceite y 2560 celdas. Resuelve fracciones de aceite/aire, velocidad y presión de mezcla. El dashboard muestra señales, capacitancia ideal y un corte del campo. El error máximo de inventario fue 0,00000401 %. Los ensayos del reductor completo y del rotor anular fallaron y se descartaron. Este banco no valida la geometría, dientes u órbitas de un wheel motor. Ver reports/cfd_shear_validation.json.

## Software abierto y ejecución portable

La solución funciona con Rust/Salva, WebAssembly autónomo, Node.js, Three.js y Noto Sans. Licencias y fuentes en THIRD_PARTY_NOTICES.md, open_source_audit.json, build/salva y engine/vendor. El sistema operativo y el navegador son requisitos del equipo; los cálculos y la interfaz no requieren servicios propietarios.

Para ver los resultados en Windows o GNU/Linux con Node.js 22+ y WebGL2:

```
node server.mjs
```

El motor nativo acelera casos nuevos en Windows. Si no está disponible, se usa el motor WebAssembly del mismo proyecto. La rampa en esa ruta se aproxima en tramos de 10 ms. Para compilar nativo en Linux, con Rust y enlazador GNU instalados:

```
cargo build --offline --locked --release --features native-parallel --manifest-path engine/Cargo.toml
```

Windows: tools/build_native.ps1 y tools/build_engine.ps1 reutilizan el toolchain abierto de V4 solo en lectura. Los datos entregados permiten usar la interfaz sin compilar. Recalcular: node build_cases.mjs. No modificar el motor sin recalcular o registrar una migración de resultados. Se verificó la ejecución con Node.js 24.18.0.

## Servidor externo

No había un servidor externo disponible. El paquete es portable: copiarlo a un servidor GNU/Linux con Node.js y conectarse por túnel SSH:

```
ssh -L 8772:127.0.0.1:8772 usuario@servidor
```

Abrir localhost:8772 en el PC. El cálculo usa CPU; el navegador dibuja la escena con WebGL2. Para resultados existentes basta Node. Para cálculo nativo se compila Rust; para la referencia bifásica se requiere OpenFOAM. La máquina QEMU usada aquí es una prueba Linux local, no una prueba en nube.

## Fuentes y límites

research/v41.md distingue datos publicados de supuestos. La topología es aproximada, sin CAD OEM ni contactos mecánicos de torque/carga, gas comprimible, cavitación o espuma. No se ha validado con un motor Komatsu real. El siguiente requisito para fidelidad cuantitativa es CAD y holguras reales, propiedades medidas del aceite y calibración de las sondas.

## Reproducir el banco bifásico

En Debian 12 con los paquetes abiertos openfoam y openfoam-examples instalados, ejecutar bash cfd/shear_bench/Allrun. Se probó OpenFOAM 1912.200626. La referencia usa gravedad en el eje Y para su propio sistema de coordenadas. Sus sondas C1–C12 difieren de S1–S12 del reductor SPH. La presión es relativa al punto de referencia del solver; la capacitancia es ideal y no incluye la electrónica/film del modelo SPH. El banco sirve para verificar el tratamiento bifásico y la transferencia de movimiento en una geometría simple; no constituye una validación de la lubricación real.
