import { env } from "cloudflare:workers";
import { Effect, Redacted } from "effect";

import type { VisitorCounts } from "@/features/visitors/counting";

/** KV methods used by the open-source contribution snapshot. */
export interface OpenSourceKVBinding {
  readonly get: (key: string, type: "text") => Promise<string | null>;
  readonly put: (key: string, value: string) => Promise<void>;
}

/** Workflow binding used to bootstrap a missing contribution snapshot. */
export interface ContributionsRefreshBinding {
  readonly create: (options: {
    readonly id: string;
    readonly params: Record<string, never>;
  }) => Promise<{ readonly id: string }>;
}

/** Durable Object namespace used to coordinate GitHub Search API requests. */
export interface GitHubSearchRateLimitBinding {
  readonly getByName: (name: string) => {
    readonly reserveSlot: (intervalMs: number) => Promise<number>;
  };
}

/** Workflow binding used to refresh the public npm package snapshot. */
export interface PackagesRefreshBinding {
  readonly create: (options: {
    readonly id: string;
    readonly params: Record<string, never>;
  }) => Promise<{ readonly id: string }>;
}

/** Workflow binding used to refresh the public Tokscale usage snapshot. */
interface TokscaleRefreshInstanceBinding {
  readonly status: () => Promise<{ readonly status: string }>;
  readonly restart: () => Promise<void>;
}

interface TokscaleRefreshBinding {
  readonly create: (options: {
    readonly id: string;
    readonly params: Record<string, never>;
  }) => Promise<{ readonly id: string }>;
  readonly get: (id: string) => Promise<TokscaleRefreshInstanceBinding>;
}

/** Runtime bindings supplied by the platform or Alchemy local runtime. */
export interface AppEnv {
  readonly CONTACT_RECIPIENT?: string;
  readonly CONTRIBUTIONS_REFRESH?: ContributionsRefreshBinding;
  readonly GITHUB_SEARCH_RATE_LIMITER?: GitHubSearchRateLimitBinding;
  readonly TOKSCALE_REFRESH?: TokscaleRefreshBinding;
  readonly RESEND_API_KEY?: Redacted.Redacted;
  readonly RESEND_FROM?: string;
  readonly TURNSTILE_SITEKEY?: string;
  readonly TURNSTILE_SECRET?: Redacted.Redacted;
  readonly GITHUB_TOKEN?: Redacted.Redacted;
  readonly WORKER_GITHUB_TOKEN?: Redacted.Redacted;
  readonly MDFROMX_API_KEY?: Redacted.Redacted;
  readonly LASTFM_API_KEY?: Redacted.Redacted;
  readonly LASTFM_USERNAME?: string;
  readonly OPEN_SOURCE_KV?: OpenSourceKVBinding;
  readonly PACKAGES_REFRESH?: PackagesRefreshBinding;
  readonly VISITOR_COUNTER?: {
    readonly getByName: (name: string) => {
      readonly getPostViews: (postSlug: string) => Promise<number>;
      readonly recordPostView: (
        postSlug: string,
        visitorId: string
      ) => Promise<number>;
      readonly track: (visitorId: string) => Promise<VisitorCounts>;
    };
  };
}

/** Unredacted platform bindings at the runtime ingress boundary. */
export interface RuntimeBindings {
  readonly CONTACT_RECIPIENT?: string;
  readonly CONTRIBUTIONS_REFRESH?: ContributionsRefreshBinding;
  readonly GITHUB_SEARCH_RATE_LIMITER?: GitHubSearchRateLimitBinding;
  readonly TOKSCALE_REFRESH?: TokscaleRefreshBinding;
  readonly RESEND_API_KEY?: string;
  readonly RESEND_FROM?: string;
  readonly TURNSTILE_SITEKEY?: string;
  readonly TURNSTILE_SECRET?: string;
  readonly GITHUB_TOKEN?: string;
  readonly WORKER_GITHUB_TOKEN?: string;
  readonly MDFROMX_API_KEY?: string;
  readonly LASTFM_API_KEY?: string;
  readonly LASTFM_USERNAME?: string;
  readonly OPEN_SOURCE_KV?: OpenSourceKVBinding;
  readonly PACKAGES_REFRESH?: PackagesRefreshBinding;
  readonly VISITOR_COUNTER?: AppEnv["VISITOR_COUNTER"];
}

/** Converts raw runtime bindings into the application's redacted config.
 * @param bindings - Worker bindings before secret redaction.
 * @returns The application environment with secret bindings redacted.
 */
export const createAppEnv = (bindings: RuntimeBindings): AppEnv => ({
  ...bindings,
  GITHUB_TOKEN:
    bindings.GITHUB_TOKEN !== undefined && bindings.GITHUB_TOKEN.length > 0
      ? Redacted.make(bindings.GITHUB_TOKEN)
      : undefined,
  WORKER_GITHUB_TOKEN:
    bindings.WORKER_GITHUB_TOKEN !== undefined &&
    bindings.WORKER_GITHUB_TOKEN.length > 0
      ? Redacted.make(bindings.WORKER_GITHUB_TOKEN)
      : undefined,
  RESEND_API_KEY:
    bindings.RESEND_API_KEY !== undefined && bindings.RESEND_API_KEY.length > 0
      ? Redacted.make(bindings.RESEND_API_KEY)
      : undefined,
  TURNSTILE_SECRET:
    bindings.TURNSTILE_SECRET !== undefined &&
    bindings.TURNSTILE_SECRET.length > 0
      ? Redacted.make(bindings.TURNSTILE_SECRET)
      : undefined,
  MDFROMX_API_KEY:
    bindings.MDFROMX_API_KEY !== undefined &&
    bindings.MDFROMX_API_KEY.length > 0
      ? Redacted.make(bindings.MDFROMX_API_KEY)
      : undefined,
  LASTFM_API_KEY:
    bindings.LASTFM_API_KEY !== undefined && bindings.LASTFM_API_KEY.length > 0
      ? Redacted.make(bindings.LASTFM_API_KEY)
      : undefined,
});

/** Loads and redacts Worker bindings at the runtime configuration boundary.
 * @returns The Effect yielding bindings available to server operations.
 */
export const getAppEnv = Effect.fn("getAppEnv")(() =>
  Effect.sync(() => {
    // SAFETY: The Worker runtime supplies these bindings; all supported keys are represented by RuntimeBindings.
    const bindings = env as RuntimeBindings;

    return createAppEnv(bindings);
  })
);
