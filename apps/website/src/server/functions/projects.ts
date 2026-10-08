import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { loadProjects } from "@/lib/projects";

/** Loads the project list through a TanStack Start server function. */
export const getProjects = createServerFn({ method: "GET" }).handler(() =>
  Effect.runPromise(loadProjects())
);
