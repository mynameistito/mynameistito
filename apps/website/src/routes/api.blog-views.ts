import { createFileRoute } from "@tanstack/react-router";
import { Effect, Option, Schema } from "effect";
import { catch as catchEffect } from "effect/Effect";
import { decodeUnknownEffect } from "effect/Schema";

import { getAppEnv } from "@/env";
import { getBlogPost } from "@/lib/blog-posts";

const BlogViewRequest = Schema.Struct({ slug: Schema.String });

const unavailable = () =>
  Response.json({ error: "Post views are unavailable." }, { status: 503 });

const postHandler = async ({ request }: { request: Request }) =>
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

      const publishedPost = decoded && getBlogPost(decoded.slug);

      if (!publishedPost) {
        return Response.json({ error: "Post not found." }, { status: 404 });
      }

      const cookie = request.headers.get("cookie") ?? "";

      const existingId =
        /(?:^|;\s*)site_visitor=(?<visitorId>[\da-f-]{36})/iu.exec(cookie)
          ?.groups?.visitorId;

      const visitorId =
        existingId ?? (yield* Effect.sync(() => crypto.randomUUID()));

      const env = Option.getOrUndefined(yield* getAppEnv().pipe(Effect.option));
      const counter = env?.VISITOR_COUNTER?.getByName("site");

      if (!counter) {
        return unavailable();
      }

      const views = yield* Effect.tryPromise(
        async () => await counter.recordPostView(publishedPost.slug, visitorId)
      ).pipe(Effect.option);

      if (Option.isNone(views)) {
        return unavailable();
      }

      return Response.json(
        { views: views.value },
        {
          headers: {
            "cache-control": "no-store",
            "set-cookie": `site_visitor=${visitorId}; Path=/; Max-Age=31536000; HttpOnly${new URL(request.url).protocol === "https:" ? "; Secure" : ""}; SameSite=Lax`,
          },
        }
      );
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
