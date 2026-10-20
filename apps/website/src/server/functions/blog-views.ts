import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { Effect, Schema } from "effect";

import { getAppEnv } from "@/env";
import { getBlogPost } from "@/lib/blog-posts";
import { verifyConfiguredTurnstile } from "@/server/functions/turnstile";

/** Expected failure from a blog view counter operation. */
// eslint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError requires this subclass syntax.
class BlogViewError extends Schema.TaggedError<BlogViewError>()(
  "BlogViewError",
  {
    cause: Schema.Defect(),
    operation: Schema.Literals(["read", "record"]),
  }
) {}

const getVisitorCounter = Effect.fn("BlogViews.getVisitorCounter")(
  function* getVisitorCounter() {
    const env = yield* getAppEnv();

    return env.VISITOR_COUNTER?.getByName("site");
  }
);

const getBlogViewsProgram = Effect.fn("BlogViews.get")(function* getBlogViews(
  slug: string
) {
  const post = getBlogPost(slug);

  if (!post) {
    return null;
  }

  const counter = yield* getVisitorCounter();

  if (!counter) {
    return null;
  }

  return yield* Effect.tryPromise({
    try: async () => await counter.getPostViews(post.slug),
    catch: (cause) => new BlogViewError({ cause, operation: "read" }),
  });
});

/** Input required to verify and record one blog post view. */
export interface RecordBlogViewInput {
  readonly cookie: string;
  readonly expectedHostname: string;
  readonly remoteIp: string;
  readonly slug: string;
  readonly turnstileToken: string;
}

/** Recorded view details used by the server-function adapter. */
export interface RecordBlogViewResult {
  readonly shouldSetCookie: boolean;
  readonly visitorId: string;
  readonly views: number | null;
}

/** Verifies and records a blog view, returning cookie details for the adapter. */
export const recordBlogViewOperation = Effect.fn("BlogViews.recordVerified")(
  function* record(input: RecordBlogViewInput) {
    const post = getBlogPost(input.slug);

    if (!post) {
      return null;
    }

    const verified = yield* verifyConfiguredTurnstile({
      token: input.turnstileToken,
      expectedHostname: input.expectedHostname,
      expectedAction: "blog-view",
      remoteIp: input.remoteIp,
    });

    if (!verified) {
      return null;
    }

    const existingId =
      /(?:^|;\s*)site_visitor=(?<visitorId>[\da-f-]{36})/iu.exec(input.cookie)
        ?.groups?.visitorId;

    const visitorId =
      existingId ?? (yield* Effect.sync(() => crypto.randomUUID()));

    const counter = yield* getVisitorCounter();

    if (!counter) {
      return {
        shouldSetCookie: existingId === undefined,
        visitorId,
        views: null,
      } satisfies RecordBlogViewResult;
    }

    const views = yield* Effect.tryPromise({
      try: async () => await counter.recordPostView(post.slug, visitorId),
      catch: (cause) => new BlogViewError({ cause, operation: "record" }),
    });

    return {
      shouldSetCookie: existingId === undefined,
      visitorId,
      views,
    } satisfies RecordBlogViewResult;
  }
);

const BlogSlugInputSchema = Schema.toStandardSchemaV1(
  Schema.Struct({ slug: Schema.String })
);

const BlogViewInputSchema = Schema.toStandardSchemaV1(
  Schema.Struct({ slug: Schema.String, turnstileToken: Schema.String })
);

/** Loads a blog post's view total on the server before the page renders.
 * @returns The current view total, or `null` when the counter is unavailable.
 */
export const getBlogViews = createServerFn({ method: "GET" })
  .validator(BlogSlugInputSchema)
  .handler(
    async ({ data }) =>
      await Effect.runPromise(
        Effect.match(getBlogViewsProgram(data.slug), {
          onFailure: () => null,
          onSuccess: (views) => views,
        })
      )
  );

/** Records a blog visit and returns the resulting total.
 * @returns The resulting view total, or `null` when recording is unavailable.
 */
export const recordBlogView = createServerFn({ method: "POST" })
  .validator(BlogViewInputSchema)
  .handler(async ({ data }) => {
    const { hostname } = new URL(
      `${getRequestProtocol()}://${getRequestHeader("host") ?? ""}`
    );

    return await Effect.runPromise(
      Effect.match(
        recordBlogViewOperation({
          cookie: getRequestHeader("cookie") ?? "",
          expectedHostname: hostname,
          remoteIp: getRequestHeader("cf-connecting-ip") ?? "",
          slug: data.slug,
          turnstileToken: data.turnstileToken,
        }),
        {
          onFailure: () => null,
          onSuccess: (result) => {
            if (result?.shouldSetCookie === true) {
              setCookie("site_visitor", result.visitorId, {
                httpOnly: true,
                maxAge: 31_536_000,
                path: "/",
                sameSite: "lax",
                secure: getRequestProtocol() === "https",
              });
            }

            return result?.views ?? null;
          },
        }
      )
    );
  });
