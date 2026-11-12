import { BoxRenderable, ImageRenderable, TextRenderable } from "@opentui/core";
import type { CliRenderer, Renderable } from "@opentui/core";

import type { WebsiteLayout, WebsitePresentation } from "./website-layout.js";

interface Palette {
  readonly page: string;
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
  child.flexGrow = Number(inRow && !trailing && grow);
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
    backgroundColor: palette.page,
    border: p.card
      ? true
      : [
          ...(p.borderTop ? ["top" as const] : []),
          ...(p.borderBottom ? ["bottom" as const] : []),
        ],
    borderColor: palette.line,
    columnGap: p.gap,
    flexDirection: directionFor(p, renderer.width),
    justifyContent: p.justifyBetween ? "space-between" : "flex-start",
    marginTop: p.marginTop,
    minWidth: 0,
    paddingBottom: p.paddingY,
    paddingLeft: Number(p.card),
    paddingRight: Number(p.card),
    paddingTop: p.paddingY,
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
  const groups: { box: BoxRenderable; presentation: WebsitePresentation }[] =
    [];

  const fixed = new Set<Renderable>();

  const images: {
    image: ImageRenderable;
    fallback: TextRenderable;
    width: number;
    height: number;
  }[] = [];

  const mountImage = (
    node: Extract<WebsiteLayout, { kind: "image" }>,
    owner: BoxRenderable
  ) => {
    const fallback = new TextRenderable(renderer, {
      content: node.alt || "◉",
      fg: palette.muted,
      height: node.height,
      visible: false,
      width: node.width,
    });

    const image = new ImageRenderable(renderer, {
      fit: "cover",
      flexShrink: 0,
      height: node.height,
      onError: () => {
        image.visible = false;
        fallback.visible = true;
      },
      source: new URL(node.source),
      width: node.width,
    });

    owner.add(image);
    owner.add(fallback);
    fixed.add(image);
    fixed.add(fallback);
    images.push({ fallback, height: node.height, image, width: node.width });
  };

  const mount = (
    node: WebsiteLayout,
    owner: BoxRenderable,
    inRow = false,
    trailing = false
  ): void => {
    if (!hasContent(node)) {
      return;
    }

    if (node.kind === "block") {
      const row = rows.get(node.index);

      if (row === undefined) {
        return;
      }

      place(row, inRow, trailing);
      owner.add(row);

      return;
    }

    if (node.kind === "image") {
      mountImage(node, owner);

      return;
    }

    const p = node.presentation;
    const direction = directionFor(p, renderer.width);
    const box = groupBox(renderer, p, palette);
    place(box, inRow, trailing);
    owner.add(box);
    groups.push({ box, presentation: p });
    const children = node.children.filter(hasContent);

    for (const [index, child] of children.entries()) {
      mount(
        child,
        box,
        direction === "row",
        p.justifyBetween && index === children.length - 1
      );
    }
  };

  mount(layout, parent);

  const reflow = () => {
    for (const { box, presentation } of groups) {
      const direction = directionFor(presentation, renderer.width);
      box.flexDirection = direction;
      box.alignItems = direction === "row" ? "center" : "stretch";
      box.rowGap = direction === "row" ? 0 : presentation.gap;
      const children = box.getChildren().filter((child) => !fixed.has(child));

      for (const [index, child] of children.entries()) {
        place(
          child,
          direction === "row",
          presentation.justifyBetween && index === children.length - 1,
          presentation.justifyBetween || child instanceof BoxRenderable
        );
      }
    }

    for (const { image, fallback, width, height } of images) {
      const visibleWidth = Math.min(width, Math.max(1, renderer.width - 4));
      image.width = visibleWidth;
      image.height = Math.max(1, Math.round((height * visibleWidth) / width));
      fallback.width = visibleWidth;
    }
  };

  reflow();

  return reflow;
};
