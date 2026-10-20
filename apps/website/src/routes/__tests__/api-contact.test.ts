import { env } from "cloudflare:workers";
import { Schema } from "effect";
import { decodeUnknownSync } from "effect/Schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RuntimeBindings } from "@/env";
import { Route } from "@/routes/api.contact";

type MutableRuntimeBindings = {
  -readonly [Key in keyof RuntimeBindings]: RuntimeBindings[Key];
};

// SAFETY: Vitest aliases cloudflare:workers to the local fixture typed as mutable RuntimeBindings.
const workerEnv = env as MutableRuntimeBindings;

const siteverifyUrl =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const resendUrl = "https://api.resend.com/emails";
const requestUrl = "https://example.com/api/contact";

const getUrl = (input: Parameters<typeof globalThis.fetch>[0]) => {
  if (input instanceof Request) {
    return input.url;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input;
};

const EmailPayloadSchema = Schema.Struct({
  from: Schema.String,
  reply_to: Schema.String,
  subject: Schema.String,
  text: Schema.String,
  to: Schema.String,
});

type EmailPayload = Schema.Schema.Type<typeof EmailPayloadSchema>;

const parseEmailPayload = async (
  body: BodyInit | null | undefined
): Promise<EmailPayload> => {
  // SAFETY: The local provider request body is JSON; the schema decoder validates its shape below.
  const parsed = JSON.parse(await new Response(body).text()) as unknown;

  return decodeUnknownSync(EmailPayloadSchema)(parsed);
};

const message = {
  company: "",
  email: "person@example.com",
  message: "Hello from the contact form.",
  name: "Test Person",
};

const validSubmission = {
  message,
  turnstileToken: "single-use-token",
};

interface FetchOptions {
  readonly siteverifySuccess?: boolean;
  readonly resendStatus?: number;
}

type JsonValue =
  | boolean
  | null
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

let activeFetchOptions: FetchOptions = {};

const fetchImplementation = Object.assign(
  async (input: Parameters<typeof globalThis.fetch>[0]): Promise<Response> => {
    const url = getUrl(input);

    if (url === siteverifyUrl) {
      return await Promise.resolve(
        Response.json({
          action: "contact",
          hostname: "example.com",
          success: activeFetchOptions.siteverifySuccess ?? true,
        })
      );
    }

    if (url === resendUrl) {
      const status = activeFetchOptions.resendStatus ?? 200;

      if (status >= 400) {
        return await Promise.resolve(
          Response.json(
            {
              message: "Provider rejected the request.",
              name: "invalid_request",
              statusCode: status,
            },
            { status }
          )
        );
      }

      return await Promise.resolve(
        Response.json({ id: "email-id" }, { status })
      );
    }

    throw new Error(`Unexpected request to ${url}`);
  },
  { preconnect: () => {} }
);

const fetchStub = vi.fn<typeof globalThis.fetch>(fetchImplementation);

const configureTurnstile = () => {
  workerEnv.TURNSTILE_SECRET = "test-turnstile-secret";
};

const configureDelivery = () => {
  workerEnv.CONTACT_RECIPIENT = "inbox@example.com";
  workerEnv.RESEND_API_KEY = "test-resend-api-key";
  workerEnv.RESEND_FROM = "Website <website@example.com>";
};

const stubFetch = (options: FetchOptions = {}) => {
  activeFetchOptions = options;
  fetchStub.mockClear();

  return fetchStub;
};

const post = async (request: Request) => {
  const handlers = Route.options.server?.handlers;

  if (!handlers || !("POST" in handlers)) {
    throw new Error("The contact route does not expose object handlers.");
  }

  const handler = handlers.POST;

  if (!handler) {
    throw new Error("The contact route does not expose a POST handler.");
  }

  const response = await handler({
    // eslint-disable-next-line sonarjs/no-undefined-assignment -- The route's declared context type is exactly undefined.
    context: undefined,
    next: () => {
      throw new Error("The contact POST handler must not continue to next().");
    },
    params: {},
    pathname: "/api/contact",
    request,
  });

  if (!(response instanceof Response)) {
    throw new Error("The contact POST handler did not return a Response.");
  }

  return response;
};

const postJson = async (body: JsonValue, headers?: HeadersInit) =>
  await post(
    new Request(requestUrl, {
      body: JSON.stringify(body),
      headers: {
        "content-type": "application/json",
        ...Object.fromEntries(new Headers(headers)),
      },
      method: "POST",
    })
  );

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    activeFetchOptions = {};
    fetchStub.mockClear();
    delete workerEnv.CONTACT_RECIPIENT;
    delete workerEnv.RESEND_API_KEY;
    delete workerEnv.RESEND_FROM;
    delete workerEnv.TURNSTILE_SECRET;
  });

  it.each([
    ["malformed JSON", "not-json"],
    [
      "schema-invalid input",
      JSON.stringify({
        ...validSubmission,
        message: { ...message, email: "invalid" },
      }),
    ],
  ])("rejects %s with 400", async (_name, body) => {
    const fetch = stubFetch();

    const response = await post(
      new Request(requestUrl, {
        body,
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid message.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a mismatched Origin before checking Turnstile", async () => {
    const fetch = stubFetch();

    const response = await postJson(validSubmission, {
      origin: "https://other.com",
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Invalid request origin.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects failed Turnstile verification without sending email", async () => {
    configureTurnstile();
    configureDelivery();
    const fetch = stubFetch({ siteverifySuccess: false });
    const response = await postJson(validSubmission);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Forbidden.",
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(getUrl(fetch.mock.calls[0]?.[0] ?? "")).toStrictEqual(siteverifyUrl);
  });

  it("sends a verified message with the expected email payload", async () => {
    configureTurnstile();
    configureDelivery();
    const fetch = stubFetch();
    const response = await postJson(validSubmission);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ sent: "true" });
    expect(fetch).toHaveBeenCalledTimes(2);

    const emailRequest = fetch.mock.calls.find(
      ([url]) => getUrl(url) === resendUrl
    );

    const init = emailRequest?.[1];
    expect({
      authorization: new Headers(init?.headers).get("authorization"),
      body: await parseEmailPayload(init?.body),
      method: init?.method,
    }).toStrictEqual({
      authorization: "Bearer test-resend-api-key",
      body: {
        from: "Website <website@example.com>",
        reply_to: message.email,
        subject: `Website message from ${message.name}`,
        text: `${message.message}\n\n— ${message.name} <${message.email}>`,
        to: "inbox@example.com",
      },
      method: "POST",
    });
  });

  it("returns 503 without contacting the provider when delivery is unconfigured", async () => {
    configureTurnstile();
    const fetch = stubFetch();
    const response = await postJson(validSubmission);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toStrictEqual({
      error:
        "Contact form is not configured. Missing: RESEND_API_KEY, CONTACT_RECIPIENT, RESEND_FROM.",
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(getUrl(fetch.mock.calls[0]?.[0] ?? "")).toStrictEqual(siteverifyUrl);
  });

  it("returns 502 when the provider returns a non-success response", async () => {
    configureTurnstile();
    configureDelivery();
    const fetch = stubFetch({ resendStatus: 400 });
    const response = await postJson(validSubmission);

    expect(fetch.mock.calls.map(([url]) => getUrl(url))).toStrictEqual([
      siteverifyUrl,
      resendUrl,
    ]);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toStrictEqual({
      error: "Unable to send this message.",
    });
  });

  it("accepts the honeypot without contacting the email provider", async () => {
    configureTurnstile();
    const fetch = stubFetch();

    const response = await postJson({
      ...validSubmission,
      message: { ...message, company: "filled honeypot" },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toStrictEqual({ sent: "true" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(getUrl(fetch.mock.calls[0]?.[0] ?? "")).toStrictEqual(siteverifyUrl);
  });
});
