import { Link, createFileRoute } from "@tanstack/react-router";
import { Eye } from "lucide-react";

import { blogPosts } from "@/lib/blog-posts";
import { socialMeta } from "@/lib/social-meta";
import { getBlogViews } from "@/server/functions/blog-views";

type BlogViews = Readonly<Record<string, number | null>>;

/** Keeps the post list available when the optional view counter is unavailable.
 * @param slug - The post slug to look up.
 * @returns The count, or `null` when the request fails.
 */
const safelyGetBlogViews = async (slug: string) => {
  try {
    return await getBlogViews({ data: { slug } });
  } catch {
    return null;
  }
};

const BlogIndexPage = () => {
  const views = Route.useLoaderData();

  return (
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
                <span>
                  {views[post.slug] === null
                    ? "Views unavailable"
                    : `${views[post.slug]?.toLocaleString()} views`}
                </span>
              </p>
            </article>
          </li>
        ))}
      </ol>
    </main>
  );
};

export const Route = createFileRoute("/blog/")({
  component: BlogIndexPage,
  loader: async (): Promise<BlogViews> => {
    const views = await Promise.all(
      blogPosts.map(async (post) => {
        const count = await safelyGetBlogViews(post.slug);

        return [post.slug, count] as const;
      })
    );

    return Object.fromEntries(views);
  },
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
