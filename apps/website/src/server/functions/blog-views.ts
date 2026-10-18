import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
import { Effect, Option, Schema } from "effect";

import { getAppEnv } from "@/env";
import { getBlogPost } from "@/lib/blog-posts";

const getVisitorCounter = async () => {
  const env = Option.getOrUndefined(
    await Effect.runPromise(Effect.option(getAppEnv()))
  );

  return env?.VISITOR_COUNTER?.getByName("site");
};

const BlogViewInputSchema = Schema.toStandardSchemaV1(
  Schema.Struct({ slug: Schema.String })
);

/** Loads a blog post's view total on the server before the page renders.
 * @returns The current view total, or `null` when the counter is unavailable.
 */
export const getBlogViews = createServerFn({ method: "GET" })
  .validator(BlogViewInputSchema)
  .handler(async ({ data }) => {
    const { slug } = data;
    const post = getBlogPost(slug);

    if (!post) {
      return null;
    }

    const counter = await getVisitorCounter();

    if (!counter) {
      return null;
    }

    try {
      return await counter.getPostViews(post.slug);
    } catch {
      return null;
    }
  });

/** Records a blog visit and returns the resulting total before page rendering.
 * @returns The resulting view total, or `null` when recording is unavailable.
 */
export const recordBlogView = createServerFn({ method: "POST" })
  .validator(BlogViewInputSchema)
  .handler(async ({ data }) => {
    const { slug } = data;
    const post = getBlogPost(slug);

    if (!post) {
      return null;
    }

    const counter = await getVisitorCounter();

    if (!counter) {
      return null;
    }

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

    try {
      return await counter.recordPostView(post.slug, visitorId);
    } catch {
      return null;
    }
  });
