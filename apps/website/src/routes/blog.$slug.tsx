import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Effect, Schema } from "effect";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

import { getBlogPost } from "@/lib/blog-posts";
import { socialMeta } from "@/lib/social-meta";

const markdownComponents: Components = {
  a: ({ children, href }) => (
    <a className="text-text underline" href={href}>
      {children}
    </a>
  ),
  h2: ({ children }) => (
    <h2 className="mb-0 text-lg leading-heading font-semibold text-text">
      {children}
    </h2>
  ),
  p: ({ children }) => (
    <p className="m-0 text-base leading-copy text-muted">{children}</p>
  ),
};

const PostViewCount = ({ slug }: { slug: string }) => {
  const [views, setViews] = useState<number | null>(null);

  // oxlint-disable-next-line react-doctor/tanstack-start-no-useeffect-fetch -- Recording a view is a post-hydration mutation and must not run during SSR.
  useEffect(() => {
    let cancelled = false;

    const recordView = async () => {
      try {
        const response = await fetch("/api/blog-views", {
          body: JSON.stringify({ slug }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });

        if (!response.ok) {
          return;
        }

        const payload: unknown = await response.json();

        const result = await Effect.runPromise(
          Schema.decodeUnknownEffect(Schema.Struct({ views: Schema.Number }))(
            payload
          )
        );

        if (!cancelled) {
          setViews(result.views);
        }
      } catch {
        // View totals are optional UI; a failed request should not block the post.
      }
    };

    void recordView();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <p
      aria-live="polite"
      className="m-0 flex items-center gap-1.5 text-sm text-muted"
    >
      <Eye aria-hidden="true" size={14} />
      {views === null ? "Views unavailable" : `${views.toLocaleString()} views`}
    </p>
  );
};

const BlogPostPage = () => {
  const { slug } = Route.useParams();
  const post = getBlogPost(slug);

  if (!post) {
    throw notFound();
  }

  return (
    <main className="page-shell-narrow pt-page-top-header pb-page-bottom">
      <article className="grid gap-6">
        <Link
          className="w-fit text-sm text-muted transition-colors hover:text-text"
          to="/blog"
        >
          ← All posts
        </Link>
        <header className="grid gap-3">
          <time
            className="text-sm leading-5 text-muted"
            dateTime={post.publishedAt}
          >
            {new Date(`${post.publishedAt}T12:00:00`).toLocaleDateString(
              "en-NZ",
              { day: "numeric", month: "long", year: "numeric" }
            )}
          </time>
          <h1 className="m-0 text-page-title leading-tight font-semibold tracking-title text-text">
            {post.title}
          </h1>
          <PostViewCount slug={post.slug} />
        </header>
        <div className="grid gap-5">
          <ReactMarkdown components={markdownComponents}>
            {post.body}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
};

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostPage,
  loader: ({ params }) => {
    if (!getBlogPost(params.slug)) {
      throw notFound();
    }
  },
  head: ({ params }) => {
    const post = getBlogPost(params.slug);

    if (!post) {
      return { meta: [{ title: "Post not found | Tito" }] };
    }

    return {
      meta: [
        { title: `${post.title} | Tito` },
        { content: post.excerpt, name: "description" },
        ...socialMeta(`${post.title} | Tito`, post.excerpt),
      ],
    };
  },
  notFoundComponent: () => (
    <main className="page-shell pt-page-top-header pb-page-bottom">
      <p className="text-muted">That post doesn’t exist.</p>
      <Link className="underline" to="/blog">
        Back to the blog
      </Link>
    </main>
  ),
});
