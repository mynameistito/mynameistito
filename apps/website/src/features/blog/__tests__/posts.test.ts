import { describe, expect, it } from "vitest";

import { blogPosts, getBlogPost, parseBlogPost } from "@/features/blog/posts";

const makePost = (publishedAt: string) =>
  parseBlogPost(`---
slug: date-example
title: Date example
publishedAt: "${publishedAt}"
excerpt: Example post
---

Post body.
`);

describe("blog posts", () => {
  it("loads post metadata and Markdown content from the blog directory", () => {
    const post = getBlogPost("first-blog-post");
    expect(post?.title).toBe("First blog post");
    expect(post?.body).toContain("Every good project starts somewhere.");
  });

  it("does not resolve unknown slugs", () => {
    expect(getBlogPost("not-published")).toBeUndefined();
  });

  it("keeps post slugs unique for independent routes and view counts", () => {
    expect(new Set(blogPosts.map((post) => post.slug)).size).toBe(
      blogPosts.length
    );
  });

  it("parses valid YAML inline comments in frontmatter", () => {
    const post = parseBlogPost(`---
slug: yaml-example
title: "Introduction" # Heading shown in the index
publishedAt: "2026-10-14"
excerpt: Example post
---

Post body.
`);

    expect(post.title).toBe("Introduction");
  });

  it("rejects impossible publication dates and accepts leap days", () => {
    expect(() => makePost("2026-02-30")).toThrow(
      "Blog publishedAt must be a real YYYY-MM-DD date."
    );
    expect(makePost("2024-02-29").publishedAt).toBe("2024-02-29");
  });
});
