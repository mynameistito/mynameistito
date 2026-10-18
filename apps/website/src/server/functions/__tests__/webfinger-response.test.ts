import { describe, expect, it } from "vitest";

import { webfinger } from "@/lib/webfinger";
import { webfingerResponse } from "@/server/functions/webfinger-response";

const responseFor = async (resource?: string) => {
  const url = new URL("https://mynameistito.com/.well-known/webfinger");

  if (resource !== undefined) {
    url.searchParams.set("resource", resource);
  }

  return await webfingerResponse(new Request(url), webfinger);
};

describe("WebFinger response", () => {
  it("returns the JRD for a supported account URI", async () => {
    const response = await responseFor("acct:contact@mynameistito.com");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/jrd+json");
    await expect(response.json()).resolves.toStrictEqual(webfinger);
  });

  it("returns a bad request when the resource is missing or malformed", async () => {
    const missingResponse = await responseFor();
    const malformedResponse = await responseFor("not a URI");

    const malformedAccountResponse = await responseFor(
      "acct:contact%ZZ@mynameistito.com"
    );

    expect(missingResponse.status).toBe(400);
    expect(malformedResponse.status).toBe(400);
    expect(malformedAccountResponse.status).toBe(400);
    await expect(missingResponse.json()).resolves.toStrictEqual({
      error: "Bad Request",
    });
    await expect(malformedResponse.json()).resolves.toStrictEqual({
      error: "Bad Request",
    });
  });

  it("returns no match for a valid but unsupported resource", async () => {
    const response = await responseFor("acct:someone-else@example.com");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toStrictEqual({ error: "No match" });
  });

  it("normalizes acct URI hosts and unreserved escapes, preserving username case", async () => {
    const normalizedHost = await responseFor("ACCT:contact@MYNAMEISTITO.COM");

    const normalizedEscape = await responseFor(
      "acct:cont%61ct@mynameistito.com"
    );

    const differentUsernameCase = await responseFor(
      "acct:Contact@mynameistito.com"
    );

    expect(normalizedHost.status).toBe(200);
    expect(normalizedEscape.status).toBe(200);
    expect(differentUsernameCase.status).toBe(404);
  });
});
