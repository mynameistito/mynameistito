import { load } from "cheerio";
import { Data, Effect } from "effect";

import { readWebsitePresentation } from "./website-layout.js";
import type { WebsiteLayout, WebsitePresentation } from "./website-layout.js";

/** The canonical portfolio origin. */
export const siteOrigin = "https://mynameistito.com";

/** A readable website page and its navigable links. */
export interface WebsitePage {
  readonly dock: readonly { readonly label: string; readonly url: string }[];
  readonly layout: WebsiteLayout;
  readonly blocks: readonly WebsiteBlock[];
  readonly title: string;
  readonly text: string;
  readonly links: readonly { readonly label: string; readonly url: string }[];
}

/** A semantic page block with inline emphasis and links preserved. */
export interface WebsiteBlock {
  readonly compact?: boolean;
  readonly tone?: "text" | "muted" | "subtle";
  // oxlint-disable-next-line sonarjs/max-union-size -- These are the distinct HTML presentation roles used by the renderer.
  readonly kind: "heading" | "subheading" | "paragraph" | "list" | "code";
  readonly spans: readonly {
    readonly text: string;
    readonly url?: string;
    readonly strong?: boolean;
    readonly browser?: boolean;
  }[];
}

/** A page could not be retrieved or translated for the terminal. */
export class WebsiteUnavailable extends Data.TaggedError("WebsiteUnavailable")<{
  readonly message: string;
}> {}

const cleanText = (text: string) =>
  text
    // oxlint-disable-next-line no-control-regex -- Strip terminal escape and control sequences from remote content.
    .replaceAll(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/gu, "")
    .replaceAll(/[ \t]+/gu, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim();

/** Translate server-rendered portfolio HTML, excluding scripts and hidden UI.
 * @param html - The website response body.
 * @param url - The current page URL, used to resolve relative links.
 * @returns Readable page content, or null when no main content exists.
 */
export const parseWebsitePage = (
  html: string,
  url: string
): WebsitePage | null => {
  const $ = load(html);

  const dock = $('nav[aria-label="Portfolio links"] > a[aria-label]')
    .toArray()
    .flatMap((node) => {
      const label = $(node).attr("aria-label");
      const href = $(node).attr("href");

      if (
        label === undefined ||
        href === undefined ||
        !URL.canParse(href, url)
      ) {
        return [];
      }

      const target = new URL(href, url);

      return ["https:", "http:"].includes(target.protocol)
        ? [{ label, url: target.href }]
        : [];
    });

  const main = $("main").first();

  if (main.length === 0) {
    return null;
  }

  main
    .find(
      'script, style, svg, canvas, nav[aria-label="Page controls"], [aria-hidden="true"], [hidden], .sr-only, button, input, textarea, label, select'
    )
    .remove();
  main.find('[class*="portfolio-scene"]').remove();
  main
    .find("form")
    .replaceWith(
      '<p data-browser-action="true">Open the contact form in your browser to send a message.</p>'
    );
  const links = new Map<string, { label: string; url: string }>();
  main.find("a[href]").each((_index, element) => {
    const anchor = $(element);
    const href = anchor.attr("href");
    const label = cleanText(anchor.text());

    if (href === undefined || href === "" || label === "") {
      return;
    }

    if (!URL.canParse(href, url)) {
      return;
    }

    const target = new URL(href, url);

    if (!["https:", "http:"].includes(target.protocol)) {
      return;
    }

    if (!links.has(target.href)) {
      links.set(target.href, { label, url: target.href });
    }
  });
  const blocks: WebsiteBlock[] = [];

  interface LayoutGroup {
    readonly kind: "group";
    readonly presentation: WebsitePresentation;
    readonly children: WebsiteLayout[];
  }

  const layout: LayoutGroup = {
    children: [],
    kind: "group",
    presentation: readWebsitePresentation(""),
  };

  let container = layout;
  const nodes = main.contents().toArray();

  type ContentNode = (typeof nodes)[number];

  let spans: { text: string; url?: string; strong?: boolean }[] = [];
  let kind: WebsiteBlock["kind"] = "paragraph";
  let compact = false;
  let tone: WebsiteBlock["tone"] = "muted";

  const addBlock = (block: WebsiteBlock) => {
    container.children.push({ index: blocks.length, kind: "block" });
    blocks.push(block);
  };

  const flush = () => {
    if (spans.some((span) => span.text.trim() !== "")) {
      const first = spans.at(0);
      const last = spans.at(-1);

      if (first !== undefined) {
        first.text = first.text.trimStart();
      }

      if (last !== undefined) {
        last.text = last.text.trimEnd();
      }

      addBlock({ compact, kind, spans, tone });
    }

    spans = [];
  };

  const appendText = (
    data: string,
    href: string | undefined,
    strong: boolean
  ) => {
    if (kind === "code") {
      spans.push({
        text: data.replaceAll(
          // oxlint-disable-next-line no-control-regex -- Preserve code indentation while removing terminal control characters.
          /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/gu,
          ""
        ),
      });

      return;
    }

    const raw = data.replaceAll(/\s+/gu, " ");
    const text = cleanText(raw);

    if (text !== "") {
      spans.push({
        strong,
        text: `${raw.startsWith(" ") ? " " : ""}${text}${raw.endsWith(" ") ? " " : ""}`,
        url: href,
      });
    } else if (raw !== "" && spans.length > 0) {
      spans.push({ text: " " });
    }
  };

  const resolveHref = (raw: string | undefined, previous?: string) => {
    if (raw === undefined || !URL.canParse(raw, url)) {
      return previous;
    }

    const parsed = new URL(raw, url);

    return ["https:", "http:"].includes(parsed.protocol)
      ? parsed.href
      : previous;
  };

  const specialElement = (node: ContentNode, tag: string): boolean => {
    if (tag === "br") {
      spans.push({ text: "\n" });

      return true;
    }

    if (tag === "img") {
      const source = resolveHref($(node).attr("src"));

      if (source !== undefined && !new URL(source).pathname.endsWith(".svg")) {
        flush();
        const pixels = Number($(node).attr("width")) || 48;
        const width = Math.min(76, Math.max(4, Math.round(pixels / 8)));

        const height = Math.min(
          18,
          Math.max(
            2,
            Math.round((Number($(node).attr("height")) || pixels) / 16)
          )
        );

        container.children.push({
          alt: $(node).attr("alt") ?? "",
          height,
          kind: "image",
          source,
          width,
        });
      }

      return true;
    }

    if ($(node).attr("data-browser-action") !== undefined) {
      flush();
      addBlock({
        kind: "paragraph",
        spans: [{ browser: true, text: $(node).text(), url }],
      });

      return true;
    }

    return false;
  };

  const enterStyle = (tag: string, classes: string) => {
    compact =
      /(?:^|\s)m-0(?:\s|$)/u.test(classes) || tag === "span" || tag === "h3";

    if (/(?:^|\s)text-text(?:\s|$)/u.test(classes)) {
      tone = "text";
    } else if (/(?:^|\s)text-subtle(?:\s|$)/u.test(classes)) {
      tone = "subtle";
    }

    if (tag === "h1") {
      kind = "heading";
    } else if (/^h[2-6]$/u.test(tag)) {
      kind = "subheading";
    } else if (tag === "li") {
      kind = "list";
    } else if (tag === "pre") {
      kind = "code";
    }
  };

  const visit = (node: ContentNode, href?: string, strong = false): void => {
    // oxlint-disable-next-line typescript/no-unsafe-enum-comparison -- domhandler represents text nodes with this serialized enum value.
    if ("data" in node && node.type === "text") {
      appendText(node.data, href, strong);

      return;
    }

    if (!("name" in node)) {
      return;
    }

    const tag = node.name;

    if (specialElement(node, tag)) {
      return;
    }

    const isBlock =
      /^(?:h[1-6]|p|li|ul|ol|pre|div|section|article|tr|blockquote|nav|header)$/u.test(
        tag
      ) ||
      /(?:^|\s)(?:grid|flex|block)(?:\s|$)/u.test($(node).attr("class") ?? "");

    if (isBlock) {
      flush();
    }

    const previousKind = kind;
    const previousContainer = container;
    const previousCompact = compact;
    const previousTone = tone;
    const classes = $(node).attr("class") ?? "";

    const grouping =
      /^(?:div|section|article|li|ul|ol|nav|header|span|a)$/u.test(tag) &&
      isBlock;

    if (grouping) {
      const group: LayoutGroup = {
        children: [],
        kind: "group",
        presentation: readWebsitePresentation(classes),
      };

      container.children.push(group);
      container = group;
    }

    enterStyle(tag, classes);

    if (/(?:^|\s)ml-\d/u.test(classes)) {
      appendText(" ", href, false);
    }

    const target = resolveHref($(node).attr("href"), href);
    const emphasized = strong || /font-(?:semibold|bold|medium)/u.test(classes);

    for (const child of $(node).contents().toArray()) {
      visit(child, target, emphasized || tag === "strong" || tag === "b");

      if (grouping && container.presentation.direction === "row") {
        flush();
      }
    }

    if (isBlock) {
      flush();
      kind = previousKind;
    }

    container = previousContainer;
    compact = previousCompact;
    tone = previousTone;
  };

  for (const node of nodes) {
    visit(node);
  }

  flush();
  const firstBlock = blocks.at(0);

  if (
    firstBlock !== undefined &&
    !blocks.some((block) => block.kind === "heading")
  ) {
    blocks[0] = { ...firstBlock, kind: "heading" };
  }

  main
    .find("h1, h2, h3, p, section, article, li, div, pre, tr")
    .each((_index, element) => {
      $(element).prepend("\n").append("\n");
    });
  main.find("br").replaceWith("\n");

  return {
    blocks,
    dock,
    layout,
    links: [...links.values()],
    text: cleanText(main.text()),
    title: cleanText($("title").text()) || "Tito",
  };
};

/** Fetch a published portfolio page with a bounded request lifetime.
 * @param url - An absolute URL on the portfolio origin.
 * @returns An Effect containing the translated page or a typed availability error.
 */
export const fetchWebsitePage = Effect.fn("Portfolio.fetchPage")(
  (url: string, signal?: AbortSignal) =>
    Effect.tryPromise({
      catch: () =>
        new WebsiteUnavailable({
          message: "The website could not be reached.",
        }),
      try: async () => {
        const target = new URL(url);

        if (target.origin !== siteOrigin) {
          return null;
        }

        const response = await fetch(target, {
          headers: { accept: "text/html" },
          signal:
            signal === undefined
              ? AbortSignal.timeout(10_000)
              : AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
        });

        if (!response.ok || new URL(response.url).origin !== siteOrigin) {
          return null;
        }

        return parseWebsitePage(await response.text(), url);
      },
    }).pipe(
      Effect.flatMap((page) =>
        page === null
          ? Effect.fail(
              new WebsiteUnavailable({
                message: "This page is unavailable in the terminal.",
              })
            )
          : Effect.succeed(page)
      )
    )
);
