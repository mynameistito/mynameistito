import { createFileRoute } from "@tanstack/react-router";
import { Effect, Option, Schema } from "effect";
import { catch as catchEffect } from "effect/Effect";
import { decodeUnknownEffect } from "effect/Schema";

import { getAppEnv } from "@/env";
import { getBlogPost } from "@/features/blog/posts";
import { recordBlogViewOperation } from "@/server/functions/blog-views";

const BlogViewRequest = Schema.Struct({
  slug: Schema.String,
  turnstileToken: Schema.String,
});

const unavailable = () =>
  Response.json({ error: "Post views are unavailable." }, { status: 503 });

const notFound = () =>
  Response.json({ error: "Post not found." }, { status: 404 });

/** Handles a browser-facing blog-view POST request.
 * @param input - The incoming request context.
 * @returns The HTTP response for the attempted view.
 */
export const postHandler = async ({ request }: { request: Request }) =>
  await Effect.runPromise(
    Effect.gen(function* recordBlogView() {
      const origin = request.headers.get("origin");

      if (origin !== new URL(request.url).origin) {
        return Response.json(
          { error: "Invalid request origin." },
          { status: 403 }
        );
      }

      const decoded = yield* Effect.tryPromise(
        async () => await request.json()
      ).pipe(
        Effect.flatMap(decodeUnknownEffect(BlogViewRequest)),
        catchEffect(() => Effect.succeed(null))
      );

      if (!decoded) {
        return notFound();
      }

      const result = yield* Effect.match(
        recordBlogViewOperation({
          cookie: request.headers.get("cookie") ?? "",
          expectedHostname: new URL(request.url).hostname,
          remoteIp: request.headers.get("cf-connecting-ip") ?? "",
          slug: decoded.slug,
          turnstileToken: decoded.turnstileToken,
        }),
        {
          onFailure: () => ({ _tag: "Unavailable" }) as const,
          onSuccess: (outcome) => outcome,
        }
      );

      if (result._tag === "PostNotFound") {
        return notFound();
      }

      if (result._tag === "Forbidden") {
        return Response.json({ error: "Forbidden." }, { status: 403 });
      }

      if (result._tag === "Unavailable") {
        return unavailable();
      }

      const headers = new Headers({ "cache-control": "no-store" });

      if (result.shouldSetCookie) {
        headers.set(
          "set-cookie",
          `site_visitor=${result.visitorId}; Path=/; Max-Age=31536000; HttpOnly${new URL(request.url).protocol === "https:" ? "; Secure" : ""}; SameSite=Lax`
        );
      }

      return Response.json({ views: result.views }, { headers });
    })
  );

const get = async ({ request }: { request: Request }) =>
  await Effect.runPromise(
    Effect.gen(function* getBlogViews() {
      const slug = new URL(request.url).searchParams.get("slug");
      const publishedPost = slug === null ? undefined : getBlogPost(slug);

      if (!publishedPost) {
        return Response.json({ error: "Post not found." }, { status: 404 });
      }

      const env = Option.getOrUndefined(yield* getAppEnv().pipe(Effect.option));
      const counter = env?.VISITOR_COUNTER?.getByName("site");

      if (!counter) {
        return unavailable();
      }

      const views = yield* Effect.tryPromise(
        async () => await counter.getPostViews(publishedPost.slug)
      ).pipe(Effect.option);

      if (Option.isNone(views)) {
        return unavailable();
      }

      return Response.json(
        { views: views.value },
        { headers: { "cache-control": "no-store" } }
      );
    })
  );

export const Route = createFileRoute("/api/blog-views")({
  server: { handlers: { GET: get, POST: postHandler } },
});
