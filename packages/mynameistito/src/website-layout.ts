/** Layout information translated from the portfolio's presentation classes. */
export interface WebsitePresentation {
  readonly direction: "column" | "row";
  readonly gap: number;
  readonly marginTop: number;
  readonly paddingY: number;
  readonly borderTop: boolean;
  readonly borderBottom: boolean;
  readonly card: boolean;
  readonly justifyBetween: boolean;
  readonly responsive: boolean;
}

/** The website hierarchy, referencing semantic text blocks by their index. */
export type WebsiteLayout =
  | { readonly kind: "block"; readonly index: number }
  | {
      readonly kind: "image";
      readonly source: string;
      readonly alt: string;
      readonly width: number;
      readonly height: number;
    }
  | {
      readonly kind: "group";
      readonly presentation: WebsitePresentation;
      readonly children: readonly WebsiteLayout[];
    };

/** Translate the website's spacing and arrangement to terminal cells.
 * @param classes - Presentation classes on one website container.
 * @returns A portable layout description without browser dependencies.
 */
export const readWebsitePresentation = (
  classes: string
): WebsitePresentation => {
  const names = new Set(classes.split(/\s+/u));
  const responsive = /(?:sm|md):grid-cols-/u.test(classes);

  const row =
    (names.has("flex") && !names.has("flex-col")) ||
    /(?:^|\s)grid-cols-/u.test(classes) ||
    responsive;

  return {
    borderBottom: names.has("border-b"),
    borderTop: names.has("border-t"),
    card:
      names.has("border") &&
      (names.has("bg-surface") || names.has("rounded-control")),
    direction: row ? "row" : "column",
    gap:
      names.has("gap-6") || names.has("gap-4")
        ? 2
        : Number(/(?:^|\s)gap-(?:x-)?[235](?:\s|$)/u.test(classes)),
    justifyBetween:
      names.has("justify-between") || /grid-cols-\[.*_auto\]/u.test(classes),
    marginTop: names.has("mt-section") || names.has("mt-8") ? 2 : 0,
    paddingY: /(?:^|\s)py-(?:3|3\.5|4|5)(?:\s|$)/u.test(classes) ? 1 : 0,
    responsive,
  };
};
