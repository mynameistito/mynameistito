/** Loads Takumi's WASM binary from the Worker static asset binding at request time.
 * @returns The WASM binary used by Takumi's Worker renderer.
 */
const loadTakumiWasm = async () => {
  const response = await fetch(
    new URL("/assets/takumi_wasm_bg.wasm", import.meta.url)
  );

  if (!response.ok) {
    throw new Error(`Unable to load Takumi WASM: ${response.status}`);
  }

  return response.arrayBuffer();
};

export default loadTakumiWasm;
