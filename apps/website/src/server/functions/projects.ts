import { createServerFn } from "@tanstack/react-start";

import { loadProjects } from "@/features/projects/projects";

/** Loads the project list through a TanStack Start server function. */
export const getProjects = createServerFn({ method: "GET" }).handler(
  async () => await loadProjects()
);
