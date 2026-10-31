import { describe, expect, it } from "vitest";

import { blogPosts, parseBlogPost } from "@/features/blog/posts";
import { formatAtomFeed, Route } from "@/routes/feed[.]xml";

const newerPost = parseBlogPost(`---
slug: newer-post
title: Newer post
publishedAt: "2026-10-21"
excerpt: The latest article.
---
Article body.
`);

const olderPost = parseBlogPost(`---
slug: older-post
title: Older post
publishedAt: "2024-02-29"
excerpt: An earlier article.
---
Article body.
`);

describe("Atom feed", () => {
  it("preserves feed metadata and uses the newest post for its updated timestamp", () => {
    const feed = formatAtomFeed([newerPost, olderPost]);

    expect(feed).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(
      feed
        .split("<entry>")[0]
        ?.split("\n")
        .map((line) => line.trim())
    ).toStrictEqual(
      expect.arrayContaining([
        "<title>My Name is Tito</title>",
        "<subtitle>Building cool things on the internet</subtitle>",
        '<link href="https://mynameistito.com/feed.xml" rel="self" />',
        '<link href="https://mynameistito.com/" />',
        "<id>https://mynameistito.com/</id>",
        "<author><name>Tito</name></author>",
        "<updated>2026-10-21T00:00:00.000Z</updated>",
      ])
    );
  });

  it("publishes exactly one entry per post in newest-first order", () => {
    const feed = formatAtomFeed([newerPost, olderPost]);

    const entryIds = [
      ...feed.matchAll(/<entry>\s*<id>(?<id>[^<]*)<\/id>/gu),
    ].map((match) => match.groups?.id);

    expect(entryIds).toStrictEqual([
      "https://mynameistito.com/blog/newer-post",
      "https://mynameistito.com/blog/older-post",
    ]);
    expect([...feed.matchAll(/<entry>/gu)]).toHaveLength(2);
  });

  it.each([newerPost, olderPost])(
    "includes absolute URLs, metadata and UTC timestamps for $slug",
    (post) => {
      const feed = formatAtomFeed([post]);
      const [, entry] = feed.split("<entry>");
      const url = `https://mynameistito.com/blog/${post.slug}`;

      expect(entry?.split("\n").map((line) => line.trim())).toStrictEqual(
        expect.arrayContaining([
          `<id>${url}</id>`,
          `<link href="${url}" />`,
          `<title>${post.title}</title>`,
          `<published>${post.publishedAt}T00:00:00.000Z</published>`,
          `<updated>${post.publishedAt}T00:00:00.000Z</updated>`,
          `<summary type="text">${post.excerpt}</summary>`,
        ])
      );
      expect(entry).not.toContain(post.body);
    }
  );

  it("escapes XML metacharacters without interpreting markup or existing entities", () => {
    const text = `Fish & <chips> > "quotes" 'apostrophes' &amp; café`;

    const post = parseBlogPost(`---
slug: escaped-post
title: ${JSON.stringify(text)}
publishedAt: "2026-10-21"
excerpt: ${JSON.stringify(text)}
---
Article body.
`);

    const feed = formatAtomFeed([post]);

    const escaped =
      "Fish &amp; &lt;chips&gt; &gt; &quot;quotes&quot; &apos;apostrophes&apos; &amp;amp; café";

    expect(feed).toContain(`<title>${escaped}</title>`);
    expect(feed).toContain(`<summary type="text">${escaped}</summary>`);
    expect(feed).not.toContain(text);
  });

  it("supports an empty list with a deterministic valid feed timestamp", () => {
    const feed = formatAtomFeed([]);

    expect(feed).not.toContain("<entry>");
    expect(feed).toContain("<updated>2026-10-10T11:37:24.000Z</updated>");
    expect(feed).toContain("<id>https://mynameistito.com/</id>");
    expect(feed).toContain("</feed>");
    expect(formatAtomFeed([])).toBe(feed);
  });

  it("serves every published post with the Atom content type and shared-cache headers", async () => {
    const handlers = Route.options.server?.handlers;

    if (!handlers || !("GET" in handlers) || !handlers.GET) {
      throw new Error("The feed route must expose a GET handler.");
    }

    const response = await handlers.GET({
      // eslint-disable-next-line sonarjs/no-undefined-assignment -- The route's declared context type is exactly undefined.
      context: undefined,
      next: () => {
        throw new Error("The feed GET handler must not continue to next().");
      },
      params: {},
      pathname: "/feed.xml",
      request: new Request("https://mynameistito.com/feed.xml"),
    });

    if (!(response instanceof Response)) {
      throw new Error("The feed GET handler must return a Response.");
    }

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/atom+xml");
    expect(response.headers.get("Cache-Control")).toBe(
      "s-maxage=3600, stale-while-revalidate"
    );
    const feed = await response.text();
    expect(feed).toBe(formatAtomFeed(blogPosts));
    expect([...feed.matchAll(/<entry>/gu)]).toHaveLength(blogPosts.length);
  });
});
