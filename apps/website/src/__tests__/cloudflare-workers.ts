/** Node test seam for the Worker-only runtime module. */
import type { RuntimeBindings } from "@/env";

type MutableRuntimeBindings = {
  -readonly [Key in keyof RuntimeBindings]: RuntimeBindings[Key];
};

export const env: MutableRuntimeBindings = {};
