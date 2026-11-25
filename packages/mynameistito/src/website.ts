import { load } from "cheerio";
import { Data, Effect, Option, Schema } from "effect";

import { profile } from "../../../apps/website/src/domain/profile.js";
import { NowPlayingResponseSchema } from "../../../apps/website/src/integrations/spotify/lastfm.js";
import type { NowPlaying } from "../../../apps/website/src/integrations/spotify/lastfm.js";
import { prepareWebsiteControls } from "./website-controls.js";
import { readWebsitePresentation } from "./website-layout.js";
import type { WebsiteLayout, WebsitePresentation } from "./website-layout.js";

/** The canonical portfolio origin. */
export const siteOrigin = "https://mynameistito.com";

/** A readable website page and its navigable links. */
export interface WebsitePage {
  readonly languages?: readonly { label: string; value: string }[];
  readonly filterQuery?: string;
  readonly openDisclosures?: readonly string[];
  readonly back?: { readonly label: string; readonly url: string };
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
  readonly experienceDetail?: boolean;
  readonly disclosure?: string;
  readonly tone?: "text" | "muted" | "subtle";
  // oxlint-disable-next-line sonarjs/max-union-size -- These are the distinct HTML presentation roles used by the renderer.
  readonly kind: "heading" | "subheading" | "paragraph" | "list" | "code";
  readonly spans: readonly {
    readonly text: string;
    readonly url?: string;
    readonly strong?: boolean;
    readonly action?: string;
    readonly tone?: "text" | "muted" | "subtle";
    readonly underline?: boolean;
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

const groupPresentationFor = (
  tag: string,
  classes: string,
  isBlock: boolean
) =>
  isBlock &&
  /^(?:div|section|article|li|ul|ol|nav|header|span|a|summary|fieldset)$/u.test(
    tag
  )
    ? readWebsitePresentation(classes)
    : undefined;

/** Translate server-rendered portfolio HTML, excluding scripts and hidden UI.
 * @param html - The website response body.
 * @param url - The current page URL, used to resolve relative links.
 * @param nowPlaying - The current track from the website's public endpoint.
 * @returns Readable page content, or null when no main content exists.
 */
export const parseWebsitePage = (
  html: string,
  url: string,
  nowPlaying?: NowPlaying | null
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

  const header = $("header.fixed").first();
  const backLink = header.find("a[href]").first();
  const backHref = backLink.attr("href");

  const back =
    backHref?.startsWith("/") === true && !backHref.startsWith("//")
      ? { label: cleanText(backLink.text()), url: new URL(backHref, url).href }
      : undefined;

  header.remove();

  const experience = main.find('section[aria-labelledby="experience-title"]');

  if (experience.find("[data-experience-highlights]").length === 0) {
    experience.find("li").each((_index, element) => {
      const row = $(element);

      const role = profile.experience.find(
        (item) => item.href === row.find("a[href]").first().attr("href")
      );

      const summary = row.find("h3").first().parent().parent();

      if (role === undefined || summary.length === 0) {
        return;
      }

      const list = $("<ul data-experience-highlights></ul>");

      for (const highlight of role.highlights) {
        list.append($("<li></li>").text(highlight));
      }

      summary.append(list);
    });
  }

  const highlights = experience.find("[data-experience-highlights]");
  experience
    .find("button[aria-expanded]")
    .replaceWith('<span data-terminal-action="experience">See more</span>');
  highlights.each((_index, element) => {
    const list = $(element);
    const summary = list.parent();
    const details = $('<p class="m-0" data-experience-detail></p>');
    details.text(
      list
        .children("li")
        .toArray()
        .map((item) => $(item).text())
        .join("\n")
    );
    list.remove();
    summary.wrap('<div class="grid min-w-0"></div>');
    summary.after(details);
  });

  const { filterQuery, languages, openDisclosures } = prepareWebsiteControls(
    $,
    url
  );

  main.append($("body > footer").first());

  if (nowPlaying) {
    const track = $('<a class="flex gap-2"></a>');
    track.attr("href", nowPlaying.spotifyUrl);
    track.append($("<span>Now playing</span>"));
    track.append(
      $("<span></span>").text(
        `${nowPlaying.title} · ${nowPlaying.artists.join(", ")}`
      )
    );
    main.find("[data-now-playing]").append(track);
  }

  const theme = main.find('button[aria-label="Toggle color theme"]');
  theme.parent().addClass("gap-2");
  theme.parent().parent().addClass("gap-2");
  theme
    .parents(".flex")
    .filter((_index, element) => $(element).find('img[width="46"]').length > 0)
    .first()
    .addClass("justify-between");
  theme.replaceWith('<span data-terminal-action="theme">☾</span>');
  main
    .find('button[aria-controls="visitor-activity-details"]')
    .replaceWith('<span data-terminal-action="visitors">Visitors</span>');
  main
    .find('button[aria-label^="Turn click sounds"]')
    .replaceWith('<span data-terminal-action="sound">Sound off</span>');
  main
    .find("svg.lucide-arrow-up-right")
    .replaceWith('<span class="text-muted">↗</span>');
  main
    .find(
      'script, style, svg, canvas, nav[aria-label="Page controls"], [aria-hidden="true"], [hidden], .sr-only, button, input, textarea, label, select'
    )
    .remove();
  main.find('[class*="portfolio-scene"]').remove();
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
    readonly disclosure?: string;
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

  let spans: {
    -readonly [
      Key in keyof WebsiteBlock["spans"][number]
    ]: WebsiteBlock["spans"][number][Key];
  }[] = [];

  let kind: WebsiteBlock["kind"] = "paragraph";
  let compact = false;
  let disclosure: string | undefined;
  let tone: WebsiteBlock["tone"] = "muted";

  const addBlock = (block: WebsiteBlock) => {
    container.children.push({ index: blocks.length, kind: "block" });
    blocks.push({ ...block, disclosure });
  };

  const flush = () => {
    if (spans.some((span) => span.text.trim() !== "")) {
      const first = spans.at(0);
      const last = spans.at(-1);

      if (kind !== "code" && first !== undefined) {
        first.text = first.text.trimStart();
      }

      if (kind !== "code" && last !== undefined) {
        last.text = last.text.trimEnd();
      }

      addBlock({ compact, kind, spans, tone });
    }

    spans = [];
  };

  const appendText = (
    data: string,
    href: string | undefined,
    strong: boolean,
    underlined = false
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
        tone,
        underline: underlined,
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
    const action = $(node).attr("data-terminal-action");

    if (action !== undefined) {
      flush();
      const target = new URL(url);
      target.hash = `terminal-${action}`;
      addBlock({
        compact: true,
        kind: "paragraph",
        spans: [{ action, text: $(node).text(), url: target.href }],
      });

      return true;
    }

    if ($(node).attr("data-experience-detail") !== undefined) {
      flush();
      addBlock({
        experienceDetail: true,
        kind: "paragraph",
        spans: [{ text: cleanText($(node).text()) }],
      });

      return true;
    }

    if (tag === "br") {
      spans.push({ text: "\n" });

      return true;
    }

    if (tag === "img") {
      const source = resolveHref($(node).attr("src"));

      if (source !== undefined && !$(node).hasClass("experience-logo-light")) {
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
          lightSource: resolveHref(
            $(node).siblings(".experience-logo-light").attr("src")
          ),
          source,
          width,
        });
      }

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

  const flushRow = (presentation: WebsitePresentation | undefined) => {
    if (presentation?.direction === "row") {
      flush();
    }
  };

  const visit = (
    node: ContentNode,
    href?: string,
    strong = false,
    underlined = false
  ): void => {
    // oxlint-disable-next-line typescript/no-unsafe-enum-comparison -- domhandler represents text nodes with this serialized enum value.
    if ("data" in node && node.type === "text") {
      appendText(node.data, href, strong, underlined);

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
      /^(?:h[1-6]|p|li|ul|ol|pre|div|section|article|tr|blockquote|nav|header|summary|output)$/u.test(
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
    const previousDisclosure = disclosure;
    const classes = $(node).attr("class") ?? "";

    const groupPresentation = groupPresentationFor(tag, classes, isBlock);

    if (groupPresentation !== undefined) {
      const id = $(node).attr("data-terminal-disclosure");
      disclosure = id ?? disclosure;

      const group: LayoutGroup = {
        children: [],
        disclosure: id,
        kind: "group",
        presentation: groupPresentation,
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
      visit(
        child,
        target,
        emphasized || /^(?:strong|b)$/u.test(tag),
        underlined || classes.split(/\s+/u).includes("underline")
      );

      flushRow(groupPresentation);
    }

    if (isBlock) {
      flush();
      kind = previousKind;
    }

    container = previousContainer;
    compact = previousCompact;
    tone = previousTone;
    disclosure = previousDisclosure;
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
    back,
    blocks,
    dock,
    filterQuery,
    languages,
    layout,
    links: [...links.values()],
    openDisclosures,
    text: cleanText(main.text()),
    title: cleanText($("title").text()) || "Tito",
  };
};

const loadNowPlaying = async (
  origin: string,
  signal: AbortSignal
): Promise<NowPlaying | null> => {
  try {
    const response = await fetch(new URL("/api/spotify/now-playing", origin), {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]),
    });

    if (response.ok) {
      const payload: unknown = await response.json();

      return Option.getOrNull(
        Schema.decodeUnknownOption(NowPlayingResponseSchema)(payload)
      );
    }
  } catch {
    return null;
  }

  return null;
};

/** Fetch a published portfolio page with a bounded request lifetime.
 * @param url - An absolute URL on the portfolio origin.
 * @param signal - Cancels the request when navigation changes.
 * @param origin - The approved local or published portfolio origin.
 * @returns An Effect containing the translated page or a typed availability error.
 */
export const fetchWebsitePage = Effect.fn("Portfolio.fetchPage")(
  (url: string, signal?: AbortSignal, origin = siteOrigin) =>
    Effect.tryPromise({
      catch: () =>
        new WebsiteUnavailable({
          message: "The website could not be reached.",
        }),
      try: async () => {
        const target = new URL(url);

        if (target.origin !== origin) {
          return null;
        }

        const timeout = AbortSignal.timeout(10_000);

        const requestSignal =
          signal === undefined ? timeout : AbortSignal.any([signal, timeout]);

        const response = await fetch(target, {
          headers: { accept: "text/html" },
          signal: requestSignal,
        });

        if (
          (!response.ok && response.status !== 404) ||
          new URL(response.url).origin !== origin
        ) {
          return null;
        }

        const html = await response.text();

        const nowPlaying = html.includes("data-now-playing")
          ? await loadNowPlaying(target.origin, requestSignal)
          : undefined;

        return parseWebsitePage(html, response.url, nowPlaying);
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
