import { load } from "cheerio";
import { Effect } from "effect";

import { cleanText } from "./website.js";

const levels = ["·", "░", "▒", "▓", "█"];

const parseDockPreviews = (html: string) => {
  const $ = load(html);
  const previews = new Map<string, string>();

  for (const section of $("section[data-social-preview]").toArray()) {
    const card = $(section);
    const label = card.attr("data-social-preview");

    if (label === undefined) {
      continue;
    }

    card.find(".social-hover-card-cover, img, svg").remove();
    card
      .find(".social-hover-card-detail, .social-hover-card-link")
      .before("\n");
    card.find(".social-hover-card-follow, .social-hover-card-org").before("  ");
    card.find(".social-hover-card-stats > span + span").before(" · ");
    card.find("figure").each((_figureIndex, figure) => {
      const weeks = $(figure)
        .find(".social-hover-card-contribution-week")
        .toArray()
        .slice(-54)
        .map((week) =>
          $(week)
            .children()
            .toArray()
            .map(
              (day) => levels[Number($(day).attr("data-level"))] ?? levels[0]
            )
        );

      const graph = Array.from({ length: 7 }, (_day, day) =>
        weeks.map((week) => week[day] ?? " ").join("")
      );

      $(figure).replaceWith(`<pre>${graph.join("\n")}</pre>`);
    });

    previews.set(
      label,
      card
        .children()
        .toArray()
        .map((child) =>
          $(child).is("pre") ? $(child).text() : cleanText($(child).text())
        )
        .filter(Boolean)
        .join("\n")
    );
  }

  return previews.size > 0 ? previews : null;
};

/** Load public social cards for the terminal.
 * @param url - The same-origin footer endpoint advertised by the website.
 * @returns The cards keyed by dock label, or null when unavailable.
 */
export const fetchDockPreviews = (url: string) =>
  Effect.tryPromise(async (signal) => {
    const response = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
    });

    return response.ok ? parseDockPreviews(await response.text()) : null;
  }).pipe(Effect.orElseSucceed(() => null));
