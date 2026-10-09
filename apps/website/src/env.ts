import { Effect, Redacted } from "effect";

import type { VisitorCounts } from "@/lib/visitor-counting";

/** Runtime bindings supplied by the platform or Alchemy local runtime. */
export interface AppEnv {
  readonly CONTACT_RECIPIENT?: string;
  readonly RESEND_API_KEY?: Redacted.Redacted<string>;
  readonly RESEND_FROM?: string;
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
  readonly GITHUB_TOKEN?: string;
  readonly WORKER_GITHUB_TOKEN?: string;
  readonly MDFROMX_API_KEY?: string;
  readonly VISITOR_COUNTER?: AppEnv["VISITOR_COUNTER"];
}

const redactSecrets = (bindings: RawAppEnv): AppEnv => ({
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
  MDFROMX_API_KEY: bindings.MDFROMX_API_KEY
    ? Redacted.make(bindings.MDFROMX_API_KEY)
    : undefined,
});

/** Loads and redacts bindings at the Worker/Vite runtime seam.
 * @returns The Effect yielding bindings available to server operations.
 */
export const getAppEnv = Effect.fn("getAppEnv")(function* getAppEnv() {
  const worker = yield* Effect.tryPromise({
    try: () => import("cloudflare:workers"),
    catch: (cause) =>
      new Error("Cloudflare Worker bindings are unavailable", { cause }),
  });
  // SAFETY: Alchemy configures bindings in both production and local development.
  const bindings = worker.env as RawAppEnv;
  if (!import.meta.env.DEV) {
    return redactSecrets(bindings);
  }

  const githubToken = [
    process.env.GITHUB_TOKEN,
    process.env.GH_TOKEN,
    process.env.WORKER_GITHUB_TOKEN,
    bindings.GITHUB_TOKEN,
    bindings.WORKER_GITHUB_TOKEN,
  ].find((token) => token !== undefined && token !== "");
  const merged = {
    ...bindings,
    CONTACT_RECIPIENT:
      process.env.CONTACT_RECIPIENT ?? bindings.CONTACT_RECIPIENT,
    GITHUB_TOKEN: githubToken,
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? bindings.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM ?? bindings.RESEND_FROM,
    MDFROMX_API_KEY: process.env.MDFROMX_API_KEY ?? bindings.MDFROMX_API_KEY,
  } satisfies RawAppEnv;
  return redactSecrets(merged);
});
