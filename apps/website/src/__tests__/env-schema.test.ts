import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const websiteDirectory = fileURLToPath(new URL("../../", import.meta.url));
const secret = "test-secret-value-not-for-production";
const productionConfig = {
  ...process.env,
  OP_SERVICE_ACCOUNT_TOKEN: "",
  APP_ENV: "production",
  CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
  CLOUDFLARE_API_TOKEN: secret,
  CONTACT_RECIPIENT: "contact@example.invalid",
  MDFROMX_API_KEY: secret,
  RESEND_API_KEY: secret,
  RESEND_FROM: "noreply@example.invalid",
  WORKER_GITHUB_TOKEN: secret,
};

const loadConfig = (env: NodeJS.ProcessEnv) =>
  // oxlint-disable-next-line sonarjs/no-os-command-from-path -- Bun is the repository package manager.
  spawnSync("bun", ["run", "varlock", "load", "--agent"], {
    cwd: websiteDirectory,
    encoding: "utf-8",
    env,
  });

describe("Varlock website schema", () => {
  it("validates production config without exposing sensitive values", () => {
    const result = loadConfig(productionConfig);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain(secret);
  });

  it("allows development without production credentials", () => {
    const result = loadConfig({
      ...productionConfig,
      APP_ENV: "development",
      CLOUDFLARE_ACCOUNT_ID: "",
      CLOUDFLARE_API_TOKEN: "",
      CONTACT_RECIPIENT: "",
      MDFROMX_API_KEY: "",
      RESEND_API_KEY: "",
      RESEND_FROM: "",
      WORKER_GITHUB_TOKEN: "",
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain("CLOUDFLARE_API_TOKEN");
  });

  it("rejects invalid or missing production values", () => {
    for (const [key, value] of [
      ["CONTACT_RECIPIENT", "not-an-email-address"],
      ["RESEND_API_KEY", ""],
    ]) {
      const result = loadConfig({ ...productionConfig, [key]: value });

      expect(result.error).toBeUndefined();
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(key);
    }
  });
});
