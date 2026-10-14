import { Link, createFileRoute } from "@tanstack/react-router";
import { Effect, Schema } from "effect";
import { Eye } from "lucide-react";
import { useEffect, useState } from "react";

import { blogPosts } from "@/lib/blog-posts";
import { socialMeta } from "@/lib/social-meta";

const PostViews = ({ slug }: { slug: string }) => {
  const [views, setViews] = useState<number | null>(null);

  // oxlint-disable-next-line react-doctor/tanstack-start-no-useeffect-fetch -- Counts are fetched after hydration so the post list stays available during storage outages.
  useEffect(() => {
    let cancelled = false;

    const loadViews = async () => {
      try {
        const response = await fetch(
          `/api/blog-views?slug=${encodeURIComponent(slug)}`
        );

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
        // View totals are optional UI; a failed request should not block the post list.
      }
    };

    void loadViews();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <span>
      {views === null ? "Views unavailable" : `${views.toLocaleString()} views`}
    </span>
  );
};

const BlogIndexPage = () => (
  <main className="page-shell pt-page-top-header pb-page-bottom">
    <section aria-labelledby="blog-title" className="grid gap-4">
      <h1
        className="m-0 text-page-title leading-tight font-semibold tracking-title text-text"
        id="blog-title"
      >
        Blog
      </h1>
      <p className="m-0 max-w-prose text-base leading-6 text-muted">
        Notes on projects, ideas, and things learned along the way.
      </p>
    </section>

    <ol className="mt-section grid list-none gap-8 p-0">
      {blogPosts.map((post) => (
        <li key={post.slug}>
          <article className="grid gap-2">
            <p className="m-0 text-sm leading-5 text-muted">
              <time dateTime={post.publishedAt}>
                {new Date(`${post.publishedAt}T12:00:00`).toLocaleDateString(
                  "en-NZ",
                  { day: "numeric", month: "long", year: "numeric" }
                )}
              </time>
            </p>
            <h2 className="m-0 text-lg leading-heading font-semibold tracking-heading text-text">
              <Link
                className="transition-colors hover:text-accent"
                params={{ slug: post.slug }}
                to="/blog/$slug"
              >
                {post.title}
              </Link>
            </h2>
            <p className="m-0 max-w-prose text-base leading-6 text-muted">
              {post.excerpt}
            </p>
            <p className="m-0 flex items-center gap-1.5 text-sm text-muted">
              <Eye aria-hidden="true" size={14} />
              <PostViews slug={post.slug} />
            </p>
          </article>
        </li>
      ))}
    </ol>
  </main>
);

export const Route = createFileRoute("/blog/")({
  component: BlogIndexPage,
  head: () => ({
    meta: [
      { title: "Blog | Tito" },
      {
        content: "Notes on projects, ideas, and things learned along the way.",
        name: "description",
      },
      ...socialMeta(
        "Blog | Tito",
        "Notes on projects, ideas, and things learned along the way."
      ),
    ],
  }),
});
