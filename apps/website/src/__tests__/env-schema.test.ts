import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const websiteDirectory = fileURLToPath(new URL("../../", import.meta.url));
const varlockEntrypoint = fileURLToPath(
  new URL("../../../../node_modules/varlock/bin/cli.js", import.meta.url)
);
const testCloudflareAccountId = randomBytes(16).toString("hex");

const validConfig = {
  ...process.env,
  OP_SERVICE_ACCOUNT_TOKEN: "",
  CLOUDFLARE_ACCOUNT_ID: testCloudflareAccountId,
  CLOUDFLARE_API_TOKEN: "not-a-real-cloudflare-token-123456",
  CONTACT_RECIPIENT: "contact@example.invalid",
  MDFROMX_API_KEY: "not-a-real-mdfromx-key-123456789",
  RESEND_API_KEY: "not-a-real-resend-key-123456789",
  RESEND_FROM: "noreply@example.invalid",
  WORKER_GITHUB_TOKEN: "not-a-real-github-token-123456789",
};

const loadConfig = (env: NodeJS.ProcessEnv, environment = "production") =>
  spawnSync(process.execPath, [varlockEntrypoint, "load", "--agent"], {
    cwd: websiteDirectory,
    encoding: "utf-8",
    env: { ...env, APP_ENV: environment },
  });

describe("Varlock website schema", () => {
  it("loads required config and redacts sensitive values", () => {
    const result = loadConfig(validConfig);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"WORKER_GITHUB_TOKEN": "no▒▒▒▒▒"');
    expect([
      result.stdout.includes('"CONTACT_RECIPIENT": "contact@example.invalid"'),
      result.stdout.includes(
        `"CLOUDFLARE_ACCOUNT_ID": "${testCloudflareAccountId.slice(0, 2)}▒▒▒▒▒"`
      ),
      result.stdout.includes(validConfig.WORKER_GITHUB_TOKEN),
      result.stdout.includes(validConfig.RESEND_API_KEY),
    ]).toStrictEqual([true, true, false, false]);
  });

  it("does not load production Cloudflare credentials in development", () => {
    const result = loadConfig(validConfig, "development");

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("CLOUDFLARE_API_TOKEN");
  });

  it("rejects an invalid contact recipient address", () => {
    const result = loadConfig({
      ...validConfig,
      CONTACT_RECIPIENT: "not-an-email-address",
    });

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("CONTACT_RECIPIENT");
  });

  it("rejects a missing required API credential", () => {
    const result = loadConfig({
      ...validConfig,
      RESEND_API_KEY: "",
    });

    expect(result.error).toBeUndefined();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("RESEND_API_KEY");
  });
});
