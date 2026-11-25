import { BoxRenderable, ImageRenderable, TextRenderable } from "@opentui/core";
import type { CliRenderer, Renderable } from "@opentui/core";

import type { WebsiteLayout, WebsitePresentation } from "./website-layout.js";

interface Palette {
  readonly openDisclosures: ReadonlySet<string>;
  readonly origin: string;
  readonly surface: string;
  readonly surfaceHover: string;
  readonly light: boolean;
  readonly line: string;
  readonly muted: string;
}

const hasContent = (node: WebsiteLayout): boolean =>
  node.kind !== "group" || node.children.some(hasContent);

const directionFor = (p: WebsitePresentation, width: number) =>
  p.responsive && width < 80 ? "column" : p.direction;

const place = (
  child: Renderable,
  inRow: boolean,
  trailing: boolean,
  grow = true
) => {
  child.width = inRow ? "auto" : "100%";
  child.minWidth = 0;
  child.flexGrow = Number(inRow && !trailing && grow);
  child.flexBasis = inRow && !trailing && grow ? 0 : "auto";
  child.flexShrink = Number(!trailing);

  if (inRow && child instanceof TextRenderable) {
    child.marginTop = 0;
    child.marginBottom = 0;
  }
};

const groupBox = (
  renderer: CliRenderer,
  p: WebsitePresentation,
  palette: Palette
) =>
  new BoxRenderable(renderer, {
    backgroundColor: p.card ? palette.surface : "transparent",
    border: p.card
      ? true
      : [
          ...(p.borderTop ? ["top" as const] : []),
          ...(p.borderBottom ? ["bottom" as const] : []),
        ],
    borderColor: palette.line,
    borderStyle: p.card ? "rounded" : "single",
    columnGap: p.gap,
    flexDirection: directionFor(p, renderer.width),
    justifyContent: p.justifyBetween ? "space-between" : "flex-start",
    marginTop: p.marginTop,
    minWidth: 0,
    paddingBottom: p.paddingBottom,
    paddingLeft: Number(p.card),
    paddingRight: Number(p.card),
    paddingTop: p.paddingTop,
    width: "100%",
  });

/** Render the website's hierarchy, responsive rows, borders, and real images.
 * @param renderer - The owning terminal renderer.
 * @param parent - The page content container.
 * @param layout - The hierarchy translated from website markup.
 * @param rows - Semantic text blocks indexed in website order.
 * @param palette - Website container colors.
 * @returns A callback to update the responsive layout after resizing.
 */
export const mountWebsiteLayout = (
  renderer: CliRenderer,
  parent: BoxRenderable,
  layout: WebsiteLayout,
  rows: ReadonlyMap<number, TextRenderable>,
  palette: Palette
): (() => void) => {
  const groups: {
    box: BoxRenderable;
    disclosure?: string;
    presentation: WebsitePresentation;
    children: { renderable: Renderable; grow: boolean; image: boolean }[];
  }[] = [];

  const images: {
    box: BoxRenderable;
    width: number;
    height: number;
  }[] = [];

  const mountImage = (
    node: Extract<WebsiteLayout, { kind: "image" }>,
    owner: BoxRenderable
  ) => {
    const box = new BoxRenderable(renderer, {
      flexShrink: 0,
      height: node.height,
      width: node.width,
    });

    const fallback = new TextRenderable(renderer, {
      content: node.alt || "◉",
      fg: palette.muted,
      height: "100%",
      visible: false,
      width: "100%",
    });

    const source = new URL(
      (palette.light ? node.lightSource : undefined) ?? node.source
    );

    const vector = source.pathname.endsWith(".svg");

    const image = new ImageRenderable(renderer, {
      fit: "cover",
      flexShrink: 0,
      height: "100%",
      width: "100%",
    });

    const showFallback = () => {
      image.visible = false;
      fallback.visible = true;
    };

    image.onError = showFallback;

    if (!vector) {
      image.source = source;
    }

    box.add(image);
    box.add(fallback);
    owner.add(box);
    images.push({ box, height: node.height, width: node.width });

    if (vector) {
      const controller = new AbortController();
      image.once("destroyed", () => {
        controller.abort();
      });

      const rasterize = async () => {
        try {
          if (source.origin !== palette.origin) {
            throw new Error("The SVG is outside the portfolio.");
          }

          const response = await fetch(source, {
            redirect: "error",
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(5000),
            ]),
          });

          if (!response.ok) {
            throw new Error("The SVG could not be loaded.");
          }

          const { default: sharp } = await import("sharp");

          const png = await sharp(await response.arrayBuffer())
            .resize(128, 128, { fit: "inside" })
            .png()
            .toBuffer();

          if (!image.isDestroyed) {
            image.source = png;
          }
        } catch {
          if (!image.isDestroyed) {
            showFallback();
          }
        }
      };

      void rasterize();
    }

    return box;
  };

  const mount = (
    node: WebsiteLayout,
    owner: BoxRenderable
  ): Renderable | undefined => {
    if (!hasContent(node)) {
      return undefined;
    }

    if (node.kind === "block") {
      const row = rows.get(node.index);

      if (row === undefined) {
        return undefined;
      }

      owner.add(row);

      return row;
    }

    if (node.kind === "image") {
      return mountImage(node, owner);
    }

    const p = node.presentation;
    const box = groupBox(renderer, p, palette);

    if (p.hover) {
      box.onMouseOver = () => {
        box.backgroundColor = palette.surfaceHover;
      };

      box.onMouseOut = () => {
        box.backgroundColor = "transparent";
      };
    }

    owner.add(box);

    const children = node.children.flatMap((child) => {
      const renderable = mount(child, box);

      return renderable === undefined
        ? []
        : [
            {
              grow: child.kind === "group" && child.presentation.grow,
              image: child.kind === "image",
              renderable,
            },
          ];
    });

    groups.push({
      box,
      children,
      disclosure: node.disclosure,
      presentation: p,
    });

    return box;
  };

  mount(layout, parent);

  const reflow = () => {
    for (const { box, children, disclosure, presentation } of groups) {
      const direction = directionFor(presentation, renderer.width);
      box.visible =
        disclosure === undefined || palette.openDisclosures.has(disclosure);
      box.flexDirection = direction;
      box.alignItems = direction === "row" ? "center" : "stretch";
      box.rowGap = direction === "row" ? 0 : presentation.gap;

      for (const [index, child] of children.entries()) {
        if (child.image) {
          continue;
        }

        const trailing =
          presentation.justifyBetween &&
          children.length > 1 &&
          index === children.length - 1;

        const flexible =
          child.grow || presentation.grid || presentation.justifyBetween;

        place(
          child.renderable,
          direction === "row",
          trailing,
          (!presentation.fixedLead || index > 0) && flexible
        );
      }
    }

    for (const { box, width, height } of images) {
      const visibleWidth = Math.min(width, Math.max(1, renderer.width - 4));
      box.width = visibleWidth;
      box.height = Math.max(1, Math.round((height * visibleWidth) / width));
    }
  };

  reflow();

  return reflow;
};
