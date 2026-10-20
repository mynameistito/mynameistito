import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { postHandler } from "@/routes/api.blog-views";
import { recordBlogViewOperation } from "@/server/functions/blog-views";

const hostname = "mynameistito.com";
const visitorId = "123e4567-e89b-12d3-a456-426614174000";

interface BlogViewPayload {
  readonly slug: string;
  readonly turnstileToken?: string;
}

const resolveViewCount = async (): Promise<number> => await Promise.resolve(4);

const recordViewCount = async (
  _slug: string,
  _visitorId: string
): Promise<number> => await Promise.resolve(5);

const counter = {
  getPostViews: vi.fn<typeof resolveViewCount>(resolveViewCount),
  recordPostView: vi.fn<typeof recordViewCount>(recordViewCount),
  track: vi.fn<() => void>(),
};

const configure = (secret = "test-secret") => {
  Object.assign(env, {
    TURNSTILE_SECRET: secret,
    VISITOR_COUNTER: { getByName: () => counter },
  });
};

const stubSiteverify = (
  response: {
    readonly success: boolean;
    readonly action: string;
    readonly hostname: string;
  },
  status = 200
) => {
  const respondToSiteverify = async (
    _input: RequestInfo | URL,
    _init?: RequestInit
  ): Promise<Response> =>
    await Promise.resolve(Response.json(response, { status }));

  const fetch = vi.fn<typeof respondToSiteverify>(respondToSiteverify);

  vi.stubGlobal("fetch", fetch);

  return fetch;
};

const operationInput = {
  cookie: "",
  expectedHostname: hostname,
  remoteIp: "192.0.2.1",
  slug: "first-blog-post",
  turnstileToken: "valid-token",
};

const post = async (payload: BlogViewPayload, headers: HeadersInit = {}) =>
  await postHandler({
    request: new Request(`https://${hostname}/api/blog-views`, {
      body: JSON.stringify(payload),
      headers: {
        origin: `https://${hostname}`,
        "content-type": "application/json",
        ...Object.fromEntries(new Headers(headers)),
      },
      method: "POST",
    }),
  });

describe("blog view write protection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();

    for (const key of Object.keys(env)) {
      Reflect.deleteProperty(env, key);
    }
  });

  describe("server-function operation", () => {
    it.each([
      {
        name: "missing token",
        token: "",
        status: 200,
        action: "blog-view",
        host: hostname,
      },
      {
        name: "invalid token",
        token: "invalid",
        status: 200,
        action: "blog-view",
        host: hostname,
        success: false,
      },
      {
        name: "wrong action",
        token: "wrong-action",
        status: 200,
        action: "visitor",
        host: hostname,
      },
      {
        name: "wrong host",
        token: "wrong-host",
        status: 200,
        action: "blog-view",
        host: "other.example",
      },
      {
        name: "unavailable Siteverify",
        token: "unavailable",
        status: 503,
        action: "blog-view",
        host: hostname,
      },
    ])(
      "does not record for $name",
      async ({ token, status, action, host, success }) => {
        configure();
        stubSiteverify(
          { success: success ?? true, action, hostname: host },
          status
        );

        await expect(
          Effect.runPromise(
            recordBlogViewOperation({
              ...operationInput,
              turnstileToken: token,
            })
          )
        ).resolves.toBeNull();
        expect(counter.recordPostView).not.toHaveBeenCalled();
      }
    );

    it("fails closed without configured Turnstile credentials", async () => {
      Object.assign(env, {
        VISITOR_COUNTER: { getByName: () => counter },
      });
      const fetch = vi.fn<typeof globalThis.fetch>();
      vi.stubGlobal("fetch", fetch);

      await expect(
        Effect.runPromise(recordBlogViewOperation(operationInput))
      ).resolves.toBeNull();
      expect(fetch).not.toHaveBeenCalled();
      expect(counter.recordPostView).not.toHaveBeenCalled();
    });

    it("rejects an unpublished slug before Siteverify or counter access", async () => {
      configure();
      const fetch = vi.fn<typeof globalThis.fetch>();
      vi.stubGlobal("fetch", fetch);

      await expect(
        Effect.runPromise(
          recordBlogViewOperation({ ...operationInput, slug: "not-published" })
        )
      ).resolves.toBeNull();
      expect(fetch).not.toHaveBeenCalled();
      expect(counter.recordPostView).not.toHaveBeenCalled();
    });

    it("records a verified view and preserves visitor-cookie details", async () => {
      configure();

      const fetch = stubSiteverify({
        success: true,
        action: "blog-view",
        hostname,
      });

      const result = await Effect.runPromise(
        recordBlogViewOperation(operationInput)
      );

      if (result === null) {
        throw new Error("Expected a verified view result.");
      }

      expect(result).toMatchObject({ shouldSetCookie: true, views: 5 });
      expect(result.visitorId).toMatch(/^[\da-f-]{36}$/iu);
      expect(counter.recordPostView).toHaveBeenCalledExactlyOnceWith(
        "first-blog-post",
        result.visitorId
      );
      expect(fetch).toHaveBeenCalledOnce();

      const body = fetch.mock.calls[0]?.[1]?.body;

      if (!(body instanceof URLSearchParams)) {
        throw new Error("Expected the Siteverify form body.");
      }

      expect(body.get("remoteip")).toBe("192.0.2.1");
    });

    it("reuses a valid visitor cookie", async () => {
      configure();
      stubSiteverify({ success: true, action: "blog-view", hostname });

      await expect(
        Effect.runPromise(
          recordBlogViewOperation({
            ...operationInput,
            cookie: `site_visitor=${visitorId}`,
          })
        )
      ).resolves.toStrictEqual({
        shouldSetCookie: false,
        visitorId,
        views: 5,
      });
      expect(counter.recordPostView).toHaveBeenCalledExactlyOnceWith(
        "first-blog-post",
        visitorId
      );
    });
  });

  describe("public blog-view POST route", () => {
    it.each([
      {
        name: "missing token",
        payload: { slug: "first-blog-post" },
        status: 404,
      },
      {
        name: "invalid token",
        payload: { slug: "first-blog-post", turnstileToken: "invalid" },
        status: 403,
        reply: { success: false, action: "blog-view", hostname },
      },
      {
        name: "wrong action",
        payload: { slug: "first-blog-post", turnstileToken: "wrong-action" },
        status: 403,
        reply: { success: true, action: "visitor", hostname },
      },
      {
        name: "wrong host",
        payload: { slug: "first-blog-post", turnstileToken: "wrong-host" },
        status: 403,
        reply: {
          success: true,
          action: "blog-view",
          hostname: "other.example",
        },
      },
    ])(
      "rejects $name before the counter write",
      async ({ payload, status, reply }) => {
        configure();
        stubSiteverify(reply ?? { success: false, action: "", hostname });

        const response = await post(payload);

        expect(response.status).toBe(status);
        expect(counter.recordPostView).not.toHaveBeenCalled();
      }
    );

    it("fails closed when Turnstile configuration is unavailable", async () => {
      Object.assign(env, {
        VISITOR_COUNTER: { getByName: () => counter },
      });
      const fetch = vi.fn<typeof globalThis.fetch>();
      vi.stubGlobal("fetch", fetch);

      const response = await post({
        slug: "first-blog-post",
        turnstileToken: "token",
      });

      expect(response.status).toBe(403);
      expect(fetch).not.toHaveBeenCalled();
      expect(counter.recordPostView).not.toHaveBeenCalled();
    });

    it("rejects an unpublished slug without Siteverify or a write", async () => {
      configure();
      const fetch = vi.fn<typeof globalThis.fetch>();
      vi.stubGlobal("fetch", fetch);

      const response = await post({
        slug: "not-published",
        turnstileToken: "token",
      });

      expect(response.status).toBe(404);
      expect(fetch).not.toHaveBeenCalled();
      expect(counter.recordPostView).not.toHaveBeenCalled();
    });

    it("records a verified view and returns the count and visitor cookie", async () => {
      configure();
      stubSiteverify({ success: true, action: "blog-view", hostname });

      const response = await post(
        { slug: "first-blog-post", turnstileToken: "valid-token" },
        { "cf-connecting-ip": "192.0.2.1" }
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toStrictEqual({ views: 5 });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("set-cookie")).toMatch(
        /^site_visitor=[\da-f-]{36}; Path=\/; Max-Age=31536000; HttpOnly.*SameSite=Lax$/iu
      );
      expect(counter.recordPostView).toHaveBeenCalledExactlyOnceWith(
        "first-blog-post",
        expect.stringMatching(/^[\da-f-]{36}$/iu)
      );
    });
  });
});
