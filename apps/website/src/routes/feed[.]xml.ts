import { createFileRoute } from "@tanstack/react-router";

import type { BlogPost } from "@/features/blog/posts";
import { blogPosts } from "@/features/blog/posts";

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

/** Serialize validated posts, ordered newest first, as an Atom feed.
 * @param posts - Published articles in newest-first order.
 * @returns Atom XML with escaped metadata and absolute article URLs.
 */
export const formatAtomFeed = (posts: readonly BlogPost[]): string => {
  // Date-only publication dates use UTC midnight; an empty feed keeps its original timestamp.
  const newestPost = posts.at(0);

  const updated =
    newestPost === undefined
      ? "2026-10-10T11:37:24.000Z"
      : `${newestPost.publishedAt}T00:00:00.000Z`;

  const entries = posts
    .map((post) => {
      const url = escapeXml(`https://mynameistito.com/blog/${post.slug}`);
      const published = escapeXml(`${post.publishedAt}T00:00:00.000Z`);

      return `  <entry>
    <id>${url}</id>
    <link href="${url}" />
    <title>${escapeXml(post.title)}</title>
    <published>${published}</published>
    <updated>${published}</updated>
    <summary type="text">${escapeXml(post.excerpt)}</summary>
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>My Name is Tito</title>
  <subtitle>Building cool things on the internet</subtitle>
  <link href="https://mynameistito.com/feed.xml" rel="self" />
  <link href="https://mynameistito.com/" />
  <updated>${escapeXml(updated)}</updated>
  <id>https://mynameistito.com/</id>
  <author><name>Tito</name></author>
${entries}
</feed>`;
};

const getFeed = () =>
  new Response(formatAtomFeed(blogPosts), {
    headers: {
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      "Content-Type": "application/atom+xml",
    },
  });

/** Atom endpoint for published blog posts. */
export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: getFeed,
    },
  },
});
