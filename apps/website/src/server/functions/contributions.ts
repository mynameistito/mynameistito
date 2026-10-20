import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { loadContributions } from "@/features/open-source/contributions";

/** Loads open-source contributions through a TanStack Start server function. */
export const getContributions = createServerFn({ method: "GET" }).handler(
  async () => await Effect.runPromise(loadContributions())
);
