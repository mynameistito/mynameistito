import { describe, expect, it } from "vitest";

import { Route } from "@/routes/api.visitors";

const postPath = async (path: string) => {
  const handlers = Route.options.server?.handlers;

  if (!handlers || !("POST" in handlers) || !handlers.POST) {
    throw new Error("The visitor route must expose a POST handler.");
  }

  const response = await handlers.POST({
    // eslint-disable-next-line sonarjs/no-undefined-assignment -- The route context type is exactly undefined.
    context: undefined,
    next: () => {
      throw new Error("The visitor handler must not continue to next().");
    },
    params: {},
    pathname: "/api/visitors",
    request: new Request("https://example.com/api/visitors", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://example.com",
      },
      body: JSON.stringify({ path, turnstileToken: "" }),
    }),
  });

  if (!(response instanceof Response)) {
    throw new Error("The visitor handler must return a Response.");
  }

  return response;
};

describe("visitor route validation", () => {
  it("accepts the AI page path while still requiring verification", async () => {
    const response = await postPath("/ai");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Forbidden.",
    });
  });

  it.each(["/unknown", "/ai/nested", "/projects/invalid_slug"])(
    "rejects the unsupported path %s before verification",
    async (path) => {
      const response = await postPath(path);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toStrictEqual({
        error: "Invalid route.",
      });
    }
  );
});
