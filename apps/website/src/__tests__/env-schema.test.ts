import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const websiteDirectory = fileURLToPath(new URL("../../", import.meta.url));
const testCloudflareAccountId = randomBytes(16).toString("hex");
const secretValues = [
  "not-a-real-cloudflare-token-123456",
  "not-a-real-mdfromx-key-123456789",
  "not-a-real-resend-key-123456789",
  "not-a-real-github-token-123456789",
];

const validProductionConfig = {
  ...process.env,
  OP_SERVICE_ACCOUNT_TOKEN: "",
  APP_ENV: "production",
  CLOUDFLARE_ACCOUNT_ID: testCloudflareAccountId,
  CLOUDFLARE_API_TOKEN: secretValues[0],
  CONTACT_RECIPIENT: "contact@example.invalid",
  MDFROMX_API_KEY: secretValues[1],
  RESEND_API_KEY: secretValues[2],
  RESEND_FROM: "noreply@example.invalid",
  WORKER_GITHUB_TOKEN: secretValues[3],
};

const loadConfig = (env: NodeJS.ProcessEnv) =>
  // oxlint-disable-next-line sonarjs/no-os-command-from-path -- Bun is the repository package manager.
  spawnSync("bun", ["run", "varlock", "load", "--agent"], {
    cwd: websiteDirectory,
    encoding: "utf-8",
    env,
  });

describe("Varlock website schema", () => {
  it("accepts complete production deployment configuration without exposing secrets", () => {
    const result = loadConfig(validProductionConfig);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    for (const secret of secretValues) {
      expect(result.stdout).not.toContain(secret);
    }
  });

  it("allows development without production-only credentials", () => {
    const result = loadConfig({
      ...process.env,
      OP_SERVICE_ACCOUNT_TOKEN: "",
      APP_ENV: "development",
      WORKER_GITHUB_TOKEN: "",
      MDFROMX_API_KEY: "",
      RESEND_API_KEY: "",
      RESEND_FROM: "",
      CONTACT_RECIPIENT: "",
      CLOUDFLARE_ACCOUNT_ID: "",
      CLOUDFLARE_API_TOKEN: "",
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("CLOUDFLARE_API_TOKEN");
  });

  it("rejects an invalid production contact recipient", () => {
    const result = loadConfig({
      ...validProductionConfig,
      CONTACT_RECIPIENT: "not-an-email-address",
    });

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("CONTACT_RECIPIENT");
  });

  it("rejects a missing production application credential", () => {
    const result = loadConfig({
      ...validProductionConfig,
      RESEND_API_KEY: "",
    });

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("RESEND_API_KEY");
  });
});
