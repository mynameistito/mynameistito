import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { loadContributions } from "@/lib/contributions";

/** Loads open-source contributions through a TanStack Start server function. */
export const getContributions = createServerFn({ method: "GET" }).handler(() =>
  Effect.runPromise(loadContributions())
);
