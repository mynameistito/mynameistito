import { Redacted } from "effect";
import { describe, expect, it } from "vitest";

import { createAppEnv } from "@/env";

const getSecretValue = (value: Redacted.Redacted<string> | undefined) =>
  value ? Redacted.value(value) : null;

describe("Worker environment configuration", () => {
  it("redacts secret bindings when entering the app environment", () => {
    const appEnv = createAppEnv({
      GITHUB_TOKEN: "github-secret",
      RESEND_API_KEY: "resend-secret",
      TURNSTILE_SECRET: "turnstile-secret",
      LASTFM_API_KEY: "lastfm-api-key",
    });

    expect({
      github: getSecretValue(appEnv.GITHUB_TOKEN),
      resend: getSecretValue(appEnv.RESEND_API_KEY),
      turnstile: getSecretValue(appEnv.TURNSTILE_SECRET),
      lastfm: getSecretValue(appEnv.LASTFM_API_KEY),
    }).toStrictEqual({
      github: "github-secret",
      resend: "resend-secret",
      turnstile: "turnstile-secret",
      lastfm: "lastfm-api-key",
    });
    expect(String(appEnv.TURNSTILE_SECRET)).not.toContain("turnstile-secret");
    expect(String(appEnv.LASTFM_API_KEY)).not.toContain("lastfm-api-key");
  });
});
