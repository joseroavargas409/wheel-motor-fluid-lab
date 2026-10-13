# Reconstruir el motor abierto

Node.js 22+ ejecuta el WASM entregado sin Rust. Para cambiar el motor se requiere Rust estable, el target WebAssembly y las fuentes vendorizadas incluidas.

Desde la raíz:

```sh
rustup target add wasm32-unknown-unknown
cargo test --offline --locked --manifest-path engine/Cargo.toml --lib
cargo build --offline --locked --release --target wasm32-unknown-unknown --manifest-path engine/Cargo.toml --lib
```

Copiar `engine/target/wasm32-unknown-unknown/release/oa2is_oil_engine.wasm` a `dashboard/oil_engine.wasm`. Recalcular 55, 95 y 125 L con `node run_case.mjs <litros>` y ejecutar `npm test`. La API rechaza datos cuyo SHA no coincide con el motor. Las fuentes vendorizadas evitan descargar crates; el compilador y el target se instalan aparte.

Para un cálculo nativo más rápido, compilar con `cargo build --offline --locked --release --features native-parallel --manifest-path engine/Cargo.toml`. El ejecutable generado se usa automáticamente en `run_case.mjs`; puede especificarse otro con `OA2IS_ENGINE`. En Windows se requiere el linker compatible con el toolchain Rust elegido. No se incluyen rutas absolutas a otro proyecto.
