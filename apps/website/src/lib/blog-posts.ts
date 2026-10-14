import { Schema } from "effect";
import { check, decodeUnknownSync, isPattern } from "effect/Schema";

const BlogMetadata = Schema.Struct({
  excerpt: Schema.String,
  publishedAt: Schema.String.pipe(check(isPattern(/^\d{4}-\d{2}-\d{2}$/u))),
  slug: Schema.String.pipe(check(isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u))),
  title: Schema.String,
});

/** A published Markdown article and its parsed frontmatter. */
export interface BlogPost {
  readonly slug: string;
  readonly title: string;
  readonly publishedAt: string;
  readonly excerpt: string;
  readonly body: string;
}

const markdownFiles = import.meta.glob<string>("../../content/blog/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
});

const parseScalar = (value: string): string => {
  if (value.startsWith('"')) {
    const parsed: unknown = JSON.parse(value);
    return decodeUnknownSync(Schema.String)(parsed);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
};

const parsePost = (source: string): BlogPost => {
  const frontmatter = source.match(
    /^---\r?\n(?<metadata>[\s\S]*?)\r?\n---\r?\n?(?<body>[\s\S]*)$/u
  );
  if (!frontmatter?.groups) {
    throw new Error("Blog post is missing YAML frontmatter.");
  }
  const { body, metadata: metadataSource } = frontmatter.groups;
  const metadataEntries = metadataSource
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator < 1) {
        throw new Error(
          "Blog frontmatter fields must be scalar key-value pairs."
        );
      }
      return [
        line.slice(0, separator).trim(),
        parseScalar(line.slice(separator + 1).trim()),
      ];
    });
  if (
    new Set(metadataEntries.map(([key]) => key)).size !== metadataEntries.length
  ) {
    throw new Error("Blog frontmatter cannot contain duplicate fields.");
  }
  const data = Object.fromEntries(metadataEntries);
  const metadata = decodeUnknownSync(BlogMetadata)(data);
  return { ...metadata, body: body.trim() };
};

const ensureUniqueSlugs = (posts: readonly BlogPost[]): readonly BlogPost[] => {
  const seenSlugs = new Set<string>();
  for (const post of posts) {
    if (seenSlugs.has(post.slug)) {
      throw new Error(`Duplicate blog post slug: ${post.slug}`);
    }
    seenSlugs.add(post.slug);
  }
  return posts;
};

/** Published Markdown posts, ordered newest first. */
export const blogPosts = ensureUniqueSlugs(
  Object.values(markdownFiles)
    .map(parsePost)
    .toSorted((left, right) =>
      right.publishedAt.localeCompare(left.publishedAt)
    )
);

/** Finds a published article by its frontmatter slug.
 * @param slug - The article's stable URL segment.
 * @returns The matching article, or undefined when it is not published.
 */
export const getBlogPost = (slug: string): BlogPost | undefined =>
  blogPosts.find((post) => post.slug === slug);
