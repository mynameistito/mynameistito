import { Stack } from "alchemy";
import {
  DurableObject as DurableObjectResource,
  providers,
  state,
  Turnstile,
  Website,
} from "alchemy/Cloudflare";
import {
  Redacted as ConfigRedacted,
  String as ConfigString,
} from "effect/Config";
import { gen } from "effect/Effect";

const WebsiteResource = gen(function* deployWebsiteResource() {
  const contactTurnstile = yield* Turnstile.Widget("ContactTurnstile", {
    domains: ["localhost", "127.0.0.1", "mynameistito.com"],
    mode: "managed",
  });

  return yield* Website.Vite("Website", {
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
      TURNSTILE_SECRET: contactTurnstile.secret,
      TURNSTILE_SITEKEY: contactTurnstile.sitekey,
      VISITOR_COUNTER: DurableObjectResource("VisitorCounter", {
        className: "VisitorCounter",
        transferredFrom: "VisitorService",
      }),
    },
    main: "worker.ts",
    name: "mynameistito",
    rootDir: "apps/website",
  });
});

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
