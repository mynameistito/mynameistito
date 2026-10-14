import { Schema } from "effect";
import { check, decodeUnknownSync, isPattern } from "effect/Schema";
import { parse as parseYaml } from "yaml";

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

const isCalendarDate = (value: string): boolean => {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const maximumDay = daysInMonth[month - 1];
  return year > 0 && day > 0 && maximumDay !== undefined && day <= maximumDay;
};

/** Parse and validate one Markdown post, including its YAML frontmatter.
 * @param source - The Markdown file contents.
 * @returns The parsed post and its validated metadata.
 */
export const parseBlogPost = (source: string): BlogPost => {
  const frontmatter = source.match(
    /^---\r?\n(?<metadata>[\s\S]*?)\r?\n---\r?\n?(?<body>[\s\S]*)$/u
  );
  if (!frontmatter?.groups) {
    throw new Error("Blog post is missing YAML frontmatter.");
  }
  const { body, metadata: metadataSource } = frontmatter.groups;
  const data: unknown = parseYaml(metadataSource);
  const metadata = decodeUnknownSync(BlogMetadata)(data);
  if (!isCalendarDate(metadata.publishedAt)) {
    throw new Error("Blog publishedAt must be a real YYYY-MM-DD date.");
  }
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
    .map(parseBlogPost)
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
