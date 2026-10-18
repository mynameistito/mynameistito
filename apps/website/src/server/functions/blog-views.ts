import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { Effect, Schema } from "effect";

import { getAppEnv } from "@/env";
import { getBlogPost } from "@/lib/blog-posts";

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

const recordBlogViewProgram = Effect.fn("BlogViews.record")(function* record(
  slug: string,
  visitorId: string
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
    try: async () => await counter.recordPostView(post.slug, visitorId),
    catch: (cause) => new BlogViewError({ cause, operation: "record" }),
  });
});

const BlogViewInputSchema = Schema.toStandardSchemaV1(
  Schema.Struct({ slug: Schema.String })
);

/** Loads a blog post's view total on the server before the page renders.
 * @returns The current view total, or `null` when the counter is unavailable.
 */
export const getBlogViews = createServerFn({ method: "GET" })
  .validator(BlogViewInputSchema)
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
    const existingId =
      /(?:^|;\s*)site_visitor=(?<visitorId>[\da-f-]{36})/iu.exec(
        getRequestHeader("cookie") ?? ""
      )?.groups?.visitorId;

    const visitorId = existingId ?? crypto.randomUUID();

    if (existingId === undefined) {
      setCookie("site_visitor", visitorId, {
        httpOnly: true,
        maxAge: 31_536_000,
        path: "/",
        sameSite: "lax",
        secure: getRequestProtocol() === "https",
      });
    }

    return await Effect.runPromise(
      Effect.match(recordBlogViewProgram(data.slug, visitorId), {
        onFailure: () => null,
        onSuccess: (views) => views,
      })
    );
  });
