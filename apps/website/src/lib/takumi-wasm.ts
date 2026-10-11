import { Effect } from "effect";

import { getAppEnv } from "@/env";

/** Loads Takumi's WASM binary from the Worker static asset binding at request time.
 * @returns The WASM binary used by Takumi's Worker renderer.
 */
const loadTakumiWasm = () =>
  Effect.gen(function* loadTakumiWasmEffect() {
    const { ASSETS } = yield* getAppEnv();

    if (!ASSETS) {
      return yield* Effect.fail(
        new Error("Takumi image rendering requires the Worker ASSETS binding.")
      );
    }

    const response = yield* Effect.tryPromise({
      try: () =>
        ASSETS.fetch("https://assets.local/assets/takumi_wasm_bg.wasm"),
      catch: (cause) =>
        new Error("Unable to load Takumi WASM asset", { cause }),
    });

    if (!response.ok) {
      return yield* Effect.fail(
        new Error(`Unable to load Takumi WASM: ${response.status}`)
      );
    }

    return yield* Effect.tryPromise({
      try: () => response.arrayBuffer(),
      catch: (cause) =>
        new Error("Unable to read Takumi WASM asset", { cause }),
    });
  }).pipe(Effect.runPromise);

export default loadTakumiWasm;
