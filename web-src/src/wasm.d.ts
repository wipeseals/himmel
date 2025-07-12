// WASM module bindings
declare module '*.js' {
  const init: () => Promise<any>;
  const analyze_files_wasm: (elfData: Uint8Array | null) => string;
  export default init;
  export { analyze_files_wasm };
}