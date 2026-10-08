import { createServerFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { loadSocialProfiles } from "@/lib/social-profiles";

/** Loads social profile details through a TanStack Start server function. */
export const getSocialProfiles = createServerFn({ method: "GET" }).handler(() =>
  Effect.runPromise(loadSocialProfiles())
);
