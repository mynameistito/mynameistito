import { env } from "cloudflare:workers";
import { Effect, Redacted } from "effect";

import type { VisitorCounts } from "@/lib/visitor-counting";

/** Runtime bindings supplied by the platform or Alchemy local runtime. */
export interface AppEnv {
  readonly CONTACT_RECIPIENT?: string;
  readonly RESEND_API_KEY?: Redacted.Redacted<string>;
  readonly RESEND_FROM?: string;
  readonly TURNSTILE_SITEKEY?: string;
  readonly TURNSTILE_SECRET?: Redacted.Redacted<string>;
  readonly GITHUB_TOKEN?: Redacted.Redacted<string>;
  readonly WORKER_GITHUB_TOKEN?: Redacted.Redacted<string>;
  readonly MDFROMX_API_KEY?: Redacted.Redacted<string>;
  readonly VISITOR_COUNTER?: {
    readonly getByName: (name: string) => {
      readonly track: (visitorId: string) => Promise<VisitorCounts>;
    };
  };
}

interface RawAppEnv {
  readonly CONTACT_RECIPIENT?: string;
  readonly RESEND_API_KEY?: string;
  readonly RESEND_FROM?: string;
  readonly TURNSTILE_SITEKEY?: string;
  readonly TURNSTILE_SECRET?: string;
  readonly GITHUB_TOKEN?: string;
  readonly WORKER_GITHUB_TOKEN?: string;
  readonly MDFROMX_API_KEY?: string;
  readonly VISITOR_COUNTER?: AppEnv["VISITOR_COUNTER"];
}

/** Converts raw runtime bindings into the application's redacted config.
 * @param bindings - Worker bindings before secret redaction.
 * @returns The application environment with secret bindings redacted.
 */
export const createAppEnv = (bindings: RawAppEnv): AppEnv => ({
  ...bindings,
  GITHUB_TOKEN: bindings.GITHUB_TOKEN
    ? Redacted.make(bindings.GITHUB_TOKEN)
    : undefined,
  WORKER_GITHUB_TOKEN: bindings.WORKER_GITHUB_TOKEN
    ? Redacted.make(bindings.WORKER_GITHUB_TOKEN)
    : undefined,
  RESEND_API_KEY: bindings.RESEND_API_KEY
    ? Redacted.make(bindings.RESEND_API_KEY)
    : undefined,
  TURNSTILE_SECRET: bindings.TURNSTILE_SECRET
    ? Redacted.make(bindings.TURNSTILE_SECRET)
    : undefined,
  MDFROMX_API_KEY: bindings.MDFROMX_API_KEY
    ? Redacted.make(bindings.MDFROMX_API_KEY)
    : undefined,
});

/** Loads and redacts Worker bindings at the runtime configuration boundary.
 * @returns The Effect yielding bindings available to server operations.
 */
export const getAppEnv = Effect.fn("getAppEnv")(() =>
  Effect.sync(() => {
    // SAFETY: Alchemy's Worker config supplies bindings matching RawAppEnv.
    const bindings = env as RawAppEnv;
    return createAppEnv(bindings);
  })
);
