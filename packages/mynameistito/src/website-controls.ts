import type { CheerioAPI } from "cheerio";

const usageLevels = ["·", "░", "▒", "▓", "█"];

const prepareUsageChart = ($: CheerioAPI) => {
  $("main figure.tokscale-heatmap").each((_index, element) => {
    const chart = $(element);

    const weeks = chart
      .children(".tokscale-heatmap-week")
      .toArray()
      .map((week) =>
        $(week)
          .children()
          .toArray()
          .map((day) =>
            $(day).attr("aria-hidden") === "true"
              ? " "
              : (usageLevels[Number($(day).attr("data-level"))] ??
                usageLevels[0])
          )
      );

    const days = Array.from({ length: 7 }, (_day, index) =>
      weeks.map((week) => week[index] ?? " ").join("")
    );

    chart.replaceWith($("<pre></pre>").text(days.join("\n")));
  });

  $("main tr").each((_index, element) => {
    const row = $(element);
    row.children("th, td").slice(1).before(" │ ");
  });
};

const prepareForms = ($: CheerioAPI) => {
  $("main #not-found-search")
    .closest("form")
    .replaceWith('<p data-terminal-action="site-search">Search this site</p>');

  const contact = $("main textarea#message").closest("form");
  contact
    .find("label[for=name], label[for=email], label[for=message]")
    .each((_index, element) => {
      const label = $(element);
      const field = label.attr("for") ?? "";

      const control = $("<span></span>").attr(
        "data-terminal-action",
        `contact-${field}`
      );

      control.text(label.text().trim());
      label.replaceWith(control);
    });
  const submit = contact.find("button[type=submit]");

  if (submit.length > 0) {
    contact
      .find('[role="status"]')
      .text("Message verification is unavailable in this terminal.");
    submit.replaceWith("<span>Send message</span>");
  }
};

/** Convert server-rendered search fields and filters into terminal controls.
 * @param $ - The parsed page markup.
 * @param url - The page address used to retain other active filters.
 * @returns The language choices and initially open disclosures.
 */
export const prepareWebsiteControls = ($: CheerioAPI, url: string) => {
  prepareForms($);
  prepareUsageChart($);
  $("main a[data-project-source]").each((_index, element) => {
    const link = $(element);
    const source = link.attr("data-project-source");

    if (source !== undefined) {
      link.attr("href", source);
    }
  });
  const target = new URL(url);
  const field = $("main #project-search, main #contribution-search").first();
  const query = field.attr("value") ?? target.searchParams.get("q") ?? "";
  const label = field.closest("label");

  if (label.length > 0) {
    const search = $('<span data-terminal-action="filter-query"></span>');
    const name = label.text().trim();
    search.text(query === "" ? name : `${name}: ${query}`);
    label.replaceWith(search);
  }

  const languages = $("main #project-language");
  const language = target.searchParams.get("language");

  const choices = languages
    .find("option")
    .toArray()
    .map((option) => ({
      label: $(option).text().trim(),
      value: $(option).attr("value") ?? "",
    }));

  if (languages.length > 0) {
    const select = $('<span data-terminal-action="filter-language"></span>');
    select.text(`Language: ${language ?? "All languages"}`);
    languages.closest("label").replaceWith(select);
  }

  const stateButtons = $("main button[data-contribution-state]");
  stateButtons.parent().addClass("gap-2");
  stateButtons.each((_index, element) => {
    const button = $(element);
    const state = button.attr("data-contribution-state") ?? "All";
    const href = new URL(target);
    href.searchParams.delete("state");

    if (state !== "All") {
      href.searchParams.set("state", state);
    }

    const link = $("<a></a>").attr("href", href.href);
    link.text(button.text().trim());

    if (button.attr("aria-pressed") === "true") {
      link.addClass("font-semibold underline text-text");
    }

    button.replaceWith(link);
  });

  if (target.pathname.replace(/\/$/u, "") === "/projects") {
    const clear = $("<a>Clear filters</a>").attr("href", target.pathname);
    $("main button")
      .filter((_index, button) => $(button).text().trim() === "Clear filters")
      .replaceWith(clear);
  }

  const openDisclosures: string[] = [];
  $("main details").each((index, element) => {
    const details = $(element);
    const summary = details.children("summary");
    const action = `disclosure-${index}`;
    const toggle = $("<span>▸</span>").attr("data-terminal-action", action);
    const content = $("<div></div>").attr("data-terminal-disclosure", action);

    if (details.attr("open") !== undefined) {
      openDisclosures.push(action);
    }

    summary.append(toggle);
    content.append(details.contents().not(summary));
    details.replaceWith([...summary.toArray(), ...content.toArray()]);
  });

  return { filterQuery: query, languages: choices, openDisclosures };
};
