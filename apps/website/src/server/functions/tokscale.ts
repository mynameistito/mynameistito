import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { loadTokscale } from "@/lib/provider/tokscale/snapshot";

/** Loads the most recently published Tokscale snapshot. */
export const getTokscale = createServerFn({ method: "GET" }).handler(() =>
  Effect.runPromise(loadTokscale())
);
