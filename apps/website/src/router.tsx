import {
  createBrowserHistory,
  createMemoryHistory,
  createRouter as createTanStackRouter,
} from "@tanstack/react-router";

import { NotFoundPage } from "@/components/not-found-page";

import { routeTree } from "./routeTree.gen";

/** Creates the application router.
 * @returns The configured TanStack Router instance.
 */
export const getRouter = () => {
  const router = createTanStackRouter({
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFoundPage,
    history:
      typeof window === "undefined" || typeof document === "undefined"
        ? createMemoryHistory()
        : createBrowserHistory(),
    routeTree,
    scrollRestoration: true,
  });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
