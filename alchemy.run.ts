import { Stack } from "alchemy";
import type { InferEnv } from "alchemy/Cloudflare";
import { providers, state, Website } from "alchemy/Cloudflare";
import { gen, provide } from "effect/Effect";

import VisitorServiceResource, {
  VisitorService,
} from "./apps/website/src/visitor-worker.ts";

export const WebsiteResource = Website.Vite("Website", {
  compatibility: {
    date: "2026-10-07",
    flags: ["nodejs_compat"],
  },
  env: { VISITOR_SERVICE: VisitorService },
  name: "mynameistito-prod",
  rootDir: "apps/website",
});

/** Bindings available to the deployed website Worker. */
export type WebsiteEnv = InferEnv<typeof WebsiteResource>;

export default Stack(
  "mynameistito",
  {
    providers: providers(),
    state: state(),
  },
  gen(function* deployWebsite() {
    const website = yield* WebsiteResource;
    return { url: website.url };
  }).pipe(provide(VisitorServiceResource))
);
