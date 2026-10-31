import {
  DurableObject as DurableObjectResource,
  KV,
  providers,
  state,
  Turnstile,
  Website,
  Workflow,
} from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import {
  Redacted as ConfigRedacted,
  String as ConfigString,
} from "effect/Config";
import { gen } from "effect/Effect";

const WebsiteResource = gen(function* deployWebsiteResource() {
  const stack = yield* Stack;
  const isProduction = stack.stage === "prod";

  const openSourceKV = yield* KV.Namespace("OpenSourceContributions", {
    title: `mynameistito-${stack.stage}-open-source-contributions`,
  });

  const turnstileDomains = isProduction
    ? ["mynameistito.com"]
    : ["localhost", "127.0.0.1", "mynameistito.mynameistito.workers.dev"];

  const contactTurnstile = yield* Turnstile.Widget("ContactTurnstile", {
    domains: turnstileDomains,
    mode: "invisible",
  });

  return yield* Website.Vite("Website", {
    compatibility: {
      date: "2026-09-25",
      flags: ["nodejs_compat"],
    },
    crons: isProduction ? ["0 */6 * * *", "0 4 * * *"] : [],
    domain: isProduction ? "mynameistito.com" : undefined,
    env: {
      CONTACT_RECIPIENT: ConfigString("CONTACT_RECIPIENT"),
      CONTRIBUTIONS_REFRESH: Workflow("ContributionsRefresh", {
        className: "ContributionsRefreshWorkflow",
      }),
      GITHUB_SEARCH_RATE_LIMITER: DurableObjectResource(
        "GitHubSearchRateLimiter",
        { className: "GitHubSearchRateLimiter" }
      ),
      GITHUB_TOKEN: ConfigRedacted("WORKER_GITHUB_TOKEN"),
      LASTFM_API_KEY: ConfigRedacted("LASTFM_API_KEY"),
      LASTFM_USERNAME: ConfigString("LASTFM_USERNAME"),
      MDFROMX_API_KEY: ConfigRedacted("MDFROMX_API_KEY"),
      OPEN_SOURCE_KV: openSourceKV,
      PACKAGES_REFRESH: Workflow("PackagesRefresh", {
        className: "PackagesRefreshWorkflow",
      }),
      RESEND_API_KEY: ConfigRedacted("RESEND_API_KEY"),
      RESEND_FROM: ConfigString("RESEND_FROM"),
      TOKSCALE_REFRESH: Workflow("TokscaleRefresh", {
        className: "TokscaleRefreshWorkflow",
      }),
      TURNSTILE_SECRET: contactTurnstile.secret,
      TURNSTILE_SITEKEY: contactTurnstile.sitekey,
      VISITOR_COUNTER: DurableObjectResource("VisitorCounter", {
        className: "VisitorCounter",
        transferredFrom: "VisitorService",
      }),
    },
    main: "worker.ts",
    name: "mynameistito",
    observability: {
      enabled: true,
      headSamplingRate: 1,
      issues: { enabled: true },
      logs: {
        enabled: true,
        headSamplingRate: 1,
        invocationLogs: true,
        persist: true,
      },
      traces: {
        enabled: true,
        headSamplingRate: 1,
        persist: true,
      },
    },
    rootDir: "apps/website",
    workersDev: isProduction
      ? { enabled: false, previewsEnabled: true }
      : undefined,
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
