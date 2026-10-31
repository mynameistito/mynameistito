import { createServerFn } from "@tanstack/react-start";

import { loadSocialProfiles } from "@/features/social/profiles";

/** Loads social profile details through a TanStack Start server function. */
export const getSocialProfiles = createServerFn({ method: "GET" }).handler(
  async () => await loadSocialProfiles()
);
