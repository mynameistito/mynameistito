import { describe, expect, it } from "vitest";

import { blogPosts, getBlogPost } from "@/lib/blog-posts";

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
});
