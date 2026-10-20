import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { loadTokscale } from "@/features/ai-usage/snapshot";

/** Loads the most recently published Tokscale snapshot. */
export const getTokscale = createServerFn({ method: "GET" }).handler(
  async () => await Effect.runPromise(loadTokscale())
);
