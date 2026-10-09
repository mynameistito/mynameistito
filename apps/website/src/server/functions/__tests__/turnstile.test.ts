import { Effect, Redacted } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstile } from "@/server/functions/turnstile";

const input = {
  token: "single-use-token",
  secret: Redacted.make("test-secret"),
  expectedHostname: "pr-123-mynameistito.workers.dev",
  expectedAction: "contact",
};

interface SiteverifyReply {
  readonly success?: boolean;
  readonly action?: string;
  readonly hostname?: string;
}

const stubSiteverify = (body: SiteverifyReply, status = 200) => {
  vi.stubGlobal("fetch", () =>
    Promise.resolve(Response.json(body, { status }))
  );
};

describe("Turnstile verification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a successful token for the expected action and request host", async () => {
    stubSiteverify({
      success: true,
      action: "contact",
      hostname: input.expectedHostname,
    });

    await expect(
      Effect.runPromise(verifyTurnstile(input))
    ).resolves.toBeTruthy();
  });

  it.each([
    {
      name: "unsuccessful token",
      body: {
        success: false,
        action: "contact",
        hostname: input.expectedHostname,
      },
    },
    {
      name: "unexpected action",
      body: {
        success: true,
        action: "signup",
        hostname: input.expectedHostname,
      },
    },
    {
      name: "unexpected hostname",
      body: {
        success: true,
        action: "contact",
        hostname: "other.workers.dev",
      },
    },
  ])("rejects $name", async ({ body }) => {
    stubSiteverify(body);

    await expect(
      Effect.runPromise(verifyTurnstile(input))
    ).resolves.toBeFalsy();
  });

  it("checks the requested action, including visitor tokens", async () => {
    stubSiteverify({
      success: true,
      action: "visitor",
      hostname: input.expectedHostname,
    });

    await expect(
      Effect.runPromise(
        verifyTurnstile({ ...input, expectedAction: "visitor" })
      )
    ).resolves.toBeTruthy();
  });

  it("fails closed when Siteverify is unavailable", async () => {
    stubSiteverify({}, 503);

    await expect(
      Effect.runPromise(verifyTurnstile(input))
    ).resolves.toBeFalsy();
  });

  it("fails closed when Siteverify returns malformed JSON", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(new Response("not json")));

    await expect(
      Effect.runPromise(verifyTurnstile(input))
    ).resolves.toBeFalsy();
  });

  it("rejects empty and oversized tokens without calling Siteverify", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>();
    vi.stubGlobal("fetch", fetch);

    await expect(
      Effect.runPromise(verifyTurnstile({ ...input, token: "" }))
    ).resolves.toBeFalsy();
    await expect(
      Effect.runPromise(verifyTurnstile({ ...input, token: "x".repeat(2049) }))
    ).resolves.toBeFalsy();
    expect(fetch).not.toHaveBeenCalled();
  });
});
