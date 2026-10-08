import { Stack } from "alchemy";
import type { InferEnv } from "alchemy/Cloudflare";
import {
  DurableObject as DurableObjectResource,
  providers,
  state,
  Website,
} from "alchemy/Cloudflare";
import {
  Redacted as ConfigRedacted,
  String as ConfigString,
} from "effect/Config";
import { gen } from "effect/Effect";

export const WebsiteResource = Website.Vite("Website", {
  compatibility: {
    date: "2026-09-25",
    flags: ["nodejs_compat"],
  },
  env: {
    CONTACT_RECIPIENT: ConfigString("CONTACT_RECIPIENT"),
    GITHUB_TOKEN: ConfigRedacted("WORKER_GITHUB_TOKEN"),
    MDFROMX_API_KEY: ConfigRedacted("MDFROMX_API_KEY"),
    RESEND_API_KEY: ConfigRedacted("RESEND_API_KEY"),
    RESEND_FROM: ConfigString("RESEND_FROM"),
    VISITOR_COUNTER: DurableObjectResource("VisitorCounter", {
      className: "VisitorCounter",
      transferredFrom: "VisitorService",
    }),
  },
  main: "worker.ts",
  name: "mynameistito",
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
  })
);
