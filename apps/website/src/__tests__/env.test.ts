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
    });

    expect(getSecretValue(appEnv.GITHUB_TOKEN)).toBe("github-secret");
    expect(getSecretValue(appEnv.RESEND_API_KEY)).toBe("resend-secret");
    expect(getSecretValue(appEnv.TURNSTILE_SECRET)).toBe("turnstile-secret");
    expect(String(appEnv.TURNSTILE_SECRET)).not.toContain("turnstile-secret");
  });
});
