import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { loadPackages } from "@/lib/packages";

/** Loads public npm package metadata through a TanStack Start server function. */
export const getPackages = createServerFn({ method: "GET" }).handler(
  async () => await Effect.runPromise(loadPackages())
);
