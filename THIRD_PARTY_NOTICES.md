# Componentes abiertos de V4.1

Código propio: MIT, ver LICENSE. Todas las dependencias del proyecto tienen licencias open source.

| Componente Rust | Versión | Licencia declarada | Avisos completos |
|---|---|---|---|
| approx | 0.5.1 | Apache-2.0 | licenses/approx-0.5.1/ |
| autocfg | 1.5.1 | Apache-2.0 OR MIT | licenses/autocfg-1.5.1/ |
| bitflags | 2.13.2 | MIT OR Apache-2.0 | licenses/bitflags-2.13.2/ |
| bytemuck | 1.25.2 | Zlib OR Apache-2.0 OR MIT | licenses/bytemuck-1.25.2/ |
| cfg-if | 1.0.5 | MIT OR Apache-2.0 | licenses/cfg-if-1.0.5/ |
| either | 1.19.0 | MIT OR Apache-2.0 | licenses/either-1.19.0/ |
| fnv | 1.0.7 | Apache-2.0 / MIT | licenses/fnv-1.0.7/ |
| generational-arena | 0.2.9 | MPL-2.0 | licenses/generational-arena-0.2.9/ |
| glam | 0.30.10 | MIT OR Apache-2.0 | licenses/glam-0.30.10/ |
| glam | 0.31.1 | MIT OR Apache-2.0 | licenses/glam-0.31.1/ |
| glam | 0.32.1 | MIT OR Apache-2.0 | licenses/glam-0.32.1/ |
| glam | 0.33.12 | MIT OR Apache-2.0 | licenses/glam-0.33.12/ |
| glamx | 0.3.1 | MIT OR Apache-2.0 | licenses/glamx-0.3.1/ |
| itertools | 0.14.0 | MIT OR Apache-2.0 | licenses/itertools-0.14.0/ |
| libm | 0.2.16 | MIT | licenses/libm-0.2.16/ |
| matrixmultiply | 0.3.11 | MIT/Apache-2.0 | licenses/matrixmultiply-0.3.11/ |
| nalgebra | 0.35.0 | Apache-2.0 | licenses/nalgebra-0.35.0/ |
| nalgebra-macros | 0.3.0 | Apache-2.0 | licenses/nalgebra-macros-0.3.0/ |
| num-bigint | 0.4.8 | MIT OR Apache-2.0 | licenses/num-bigint-0.4.8/ |
| num-complex | 0.4.6 | MIT OR Apache-2.0 | licenses/num-complex-0.4.6/ |
| num-integer | 0.1.47 | MIT OR Apache-2.0 | licenses/num-integer-0.1.47/ |
| num-rational | 0.4.2 | MIT OR Apache-2.0 | licenses/num-rational-0.4.2/ |
| num-traits | 0.2.19 | MIT OR Apache-2.0 | licenses/num-traits-0.2.19/ |
| oa2is_oil_engine | 0.4.1 | MIT | licenses/oa2is_oil_engine-0.4.0/ |
| proc-macro2 | 1.0.107 | MIT OR Apache-2.0 | licenses/proc-macro2-1.0.107/ |
| quote | 1.0.47 | MIT OR Apache-2.0 | licenses/quote-1.0.47/ |
| rawpointer | 0.2.1 | MIT/Apache-2.0 | licenses/rawpointer-0.2.1/ |
| safe_arch | 1.2.0 | Zlib OR Apache-2.0 OR MIT | licenses/safe_arch-1.2.0/ |
| salva3d | 0.10.0 | Apache-2.0 | licenses/salva3d-0.10.0/ |
| simba | 0.10.2 | Apache-2.0 | licenses/simba-0.10.2/ |
| syn | 2.0.119 | MIT OR Apache-2.0 | licenses/syn-2.0.119/ |
| typenum | 1.20.1 | MIT OR Apache-2.0 | licenses/typenum-1.20.1/ |
| unicode-ident | 1.0.27 | (MIT OR Apache-2.0) AND Unicode-3.0 | licenses/unicode-ident-1.0.27/ |
| wide | 1.7.1 | Zlib OR Apache-2.0 OR MIT | licenses/wide-1.7.1/ |

Three.js r180: MIT, dashboard/vendor/LICENSE-three.txt. Noto Sans: SIL Open Font License 1.1, dashboard/vendor/fonts/OFL.txt. Node.js: MIT, licenses/Node-LICENSE.txt contiene también sus dependencias. Rust y su biblioteca estándar: MIT/Apache-2.0 y avisos de terceros, licenses/Rust-COPYRIGHT-library.html.

Salva: revisión 51c153e05974836eea17db445e30f1ff64bb5b32, fuente incluida y modificada en build/salva (divergencia relativa a paredes móviles y caché de denominadores rígidos; cambios propios documentados). Dependencias de crates.io vendorizadas y sin modificaciones en engine/vendor; incluyen sus fuentes y avisos, también generational-arena bajo MPL-2.0. Cargo.lock fija las versiones.

El motor entregado es WebAssembly autónomo, sin importaciones, .pyd, DLL ni dependencias de Anaconda, CUDA o un servicio comercial. Node ejecuta el cálculo y sirve los archivos locales; no requiere paquetes npm. El equipo actual usa Windows: la afirmación de código abierto se refiere a los componentes integrados, no al sistema operativo ni a la herramienta usada para crear el código. El paquete puede ejecutarse con Node y un navegador WebGL2 en GNU/Linux.

## Dependencias añadidas en V4.1

Rayon 1.11.0, rayon-core 1.13.0, crossbeam-deque 0.8.6, crossbeam-epoch 0.9.18 y crossbeam-utils 0.8.21: MIT OR Apache-2.0. Fuentes completas en engine/vendor y avisos en licenses.

Referencia externa: OpenFOAM 1912, GPL-3+ (paquetes Debian main). Su binario no se redistribuye en el paquete de la aplicación; se incluyen los casos y resultados propios y las instrucciones para reproducirlos. QEMU y la máquina Debian se usaron para pruebas locales. Los archivos descargados para investigación, las claves y los discos de la máquina de pruebas no forman parte del paquete portable.

El perfil de configuración del banco CFD adapta parámetros de los ejemplos GPL-3+ de OpenFOAM 1912. Sus entradas se distribuyen bajo GPL-3.0-or-later; licencia en cfd/shear_bench/LICENSE. Los datos de resultados son propios de esta ejecución. El servidor, dashboard y motor SPH propio siguen bajo MIT y Salva bajo Apache-2.0.
