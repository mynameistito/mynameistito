// oxlint-disable github/async-preventdefault -- OpenTUI handlers are synchronous; only their enclosing renderer bootstrap is async.
import { spawn } from "node:child_process";

import {
  bold,
  BoxRenderable,
  createCliRenderer,
  fg,
  InputRenderable,
  link,
  ScrollBoxRenderable,
  StyledText,
  TextRenderable,
  underline,
} from "@opentui/core";
import type { CliRenderer, KeyEvent } from "@opentui/core";
import { Effect } from "effect";

import { links, profile } from "./data.js";
import { mountWebsiteLayout } from "./terminal-layout.js";
import type { WebsiteLayout } from "./website-layout.js";
import { fetchWebsitePage, siteOrigin } from "./website.js";
import type { WebsiteBlock, WebsitePage } from "./website.js";

const routes = [
  ["Home", "/"],
  ["About", "/about"],
  ["Projects", "/projects"],
  ["Open source", "/open-source"],
  ["Packages", "/packages"],
  ["Blog", "/blog"],
  ["AI", "/ai"],
  ["Links", "/links"],
  ["Contact", "/contact"],
] as const;

const dark = {
  accent: "#7196c8",
  code: "#181b1d",
  light: false,
  line: "#292c2e",
  match: "#1b2026",
  muted: "#a1a4a6",
  page: "#101112",
  subtle: "#8b9093",
  surface: "#151718",
  surfaceHover: "#141617",
  text: "#f1f2f2",
};

const light = {
  accent: "#3f6798",
  code: "#eceff1",
  light: true,
  line: "#e0e3e4",
  match: "#dce7f3",
  muted: "#5f6568",
  page: "#f7f8f8",
  subtle: "#686f72",
  surface: "#ffffff",
  surfaceHover: "#edf0f1",
  text: "#17191a",
};

const blockBackground = (kind: WebsiteBlock["kind"], codeColor: string) =>
  kind === "code" ? codeColor : "transparent";

const wholeBlockTarget = (block: WebsiteBlock) => {
  const url = block.spans.find((span) => span.url !== undefined)?.url;

  return url !== undefined &&
    block.spans.every((span) => span.url === url || span.text.trim() === "")
    ? url
    : undefined;
};

const encodeSearchQuery = (query: string) => {
  // TanStack Router parses JSON-shaped query values before validation.
  try {
    JSON.parse(query);
  } catch {
    return query;
  }

  return JSON.stringify(query);
};

/** Start the terminal portfolio with semantic page content and browser navigation.
 * @param options - Optional renderer and page loader for embedded terminals and deterministic checks.
 * @returns A promise resolved when the first page has loaded.
 */
export const startTerminal = async (
  options: {
    readonly site?: string;
    readonly renderer?: CliRenderer;
    readonly loadPage?: typeof fetchWebsitePage;
    readonly openExternal?: (url: string) => void;
  } = {}
): Promise<void> => {
  const site = new URL(options.site ?? siteOrigin);

  if (!["http:", "https:"].includes(site.protocol)) {
    throw new Error("The portfolio URL must use HTTP or HTTPS.");
  }

  const { origin } = site;
  let closed = false;
  let colors = dark;
  let revision = 0;
  let requestController = new AbortController();
  const pageCache = new Map<string, WebsitePage>();

  const renderer =
    options.renderer ??
    (await createCliRenderer({
      backgroundColor: colors.page,
      exitOnCtrlC: true,
      onDestroy: () => {
        closed = true;
      },
    }));

  renderer.once("destroy", () => {
    closed = true;
    requestController.abort();
  });
  const loadPage = options.loadPage ?? fetchWebsitePage;

  const shell = new BoxRenderable(renderer, {
    alignItems: "center",
    backgroundColor: colors.page,
    flexDirection: "column",
    height: "100%",
    paddingLeft: 2,
    paddingRight: 2,
    width: "100%",
  });

  renderer.root.add(shell);

  const chrome = new BoxRenderable(renderer, {
    border: [],
    borderColor: colors.line,
    flexDirection: "column",
    flexShrink: 0,
    maxWidth: 88,
    paddingTop: 1,
    width: "100%",
  });

  shell.add(chrome);

  let backUrl = `${origin}/`;

  const address = new TextRenderable(renderer, {
    content: "",
    fg: colors.muted,
    flexGrow: 1,
    height: 1,
    onMouseUp: () => {
      // oxlint-disable-next-line no-use-before-define -- Callbacks run after initialization.
      follow(backUrl);
    },
  });

  const toolbar = new BoxRenderable(renderer, {
    border: ["bottom"],
    borderColor: colors.line,
    columnGap: 1,
    flexDirection: "row",
    height: 2,
    width: "100%",
  });

  toolbar.add(address);

  const headerVisitors = new TextRenderable(renderer, {
    bg: colors.surface,
    content: " ♙ ",
    fg: colors.muted,
    height: 1,
    width: 3,
  });

  const headerSound = new TextRenderable(renderer, {
    bg: colors.surface,
    content: " ♪×",
    fg: colors.muted,
    height: 1,
    width: 3,
  });

  const themeControl = new TextRenderable(renderer, {
    bg: colors.surface,
    content: " ☾ ",
    fg: colors.muted,
    height: 1,
    onMouseUp: () => {
      // oxlint-disable-next-line no-use-before-define -- Callbacks run after initialization.
      toggleTheme();
    },
    width: 3,
  });

  for (const control of [headerVisitors, headerSound, themeControl]) {
    toolbar.add(control);
  }

  chrome.add(toolbar);

  const menu = new BoxRenderable(renderer, {
    columnGap: 2,
    flexDirection: "row",
    flexShrink: 0,
    flexWrap: "wrap",
    marginBottom: 1,
    rowGap: 1,
    visible: false,
    width: "100%",
  });

  let activeRouteIndex = 0;

  const navigation = routes.map(([name, path]) => {
    const item = new TextRenderable(renderer, {
      content: name,
      fg: colors.muted,
      height: 1,
      onMouseUp: () => {
        // oxlint-disable-next-line no-use-before-define -- Mouse callbacks run after navigation initialization.
        follow(new URL(path, origin).href);
      },
      width: name.length,
    });

    menu.add(item);

    return item;
  });

  const search = new InputRenderable(renderer, {
    backgroundColor: colors.page,
    focusedBackgroundColor: colors.page,
    focusedTextColor: colors.text,
    placeholder: "Find on page…",
    visible: false,
    width: "100%",
  });

  chrome.add(search);

  const scroll = new ScrollBoxRenderable(renderer, {
    contentOptions: { alignItems: "center", paddingBottom: 3, paddingTop: 2 },
    flexGrow: 1,
    minHeight: 1,
    scrollX: false,
    scrollY: true,
    scrollbarOptions: { showArrows: false },
    width: "100%",
  });

  shell.add(scroll);

  const article = new BoxRenderable(renderer, {
    flexDirection: "column",
    flexShrink: 0,
    maxWidth: 88,
    width: "100%",
  });

  scroll.add(article);

  const footer = new BoxRenderable(renderer, {
    alignItems: "center",
    border: [],
    borderColor: colors.line,
    flexDirection: "column",
    flexShrink: 0,
    maxWidth: 88,
    paddingTop: 1,
    width: "100%",
  });

  footer.add(menu);

  const dock = new BoxRenderable(renderer, {
    border: true,
    borderColor: colors.line,
    borderStyle: "rounded",
    columnGap: 3,
    flexDirection: "row",
    flexShrink: 0,
    marginBottom: 1,
    paddingLeft: 2,
    paddingRight: 2,
  });

  footer.add(dock);

  const status = new TextRenderable(renderer, {
    content: "Tab links · / find · m pages · t theme · ? help · q quit",
    fg: colors.muted,
    height: 1,
    width: "100%",
  });

  footer.add(status);
  shell.add(footer);

  let currentUrl = `${origin}/`;
  const history = [{ scroll: 0, url: currentUrl }];
  let historyIndex = 0;

  let displayedEntry: { scroll: number; url: string } | undefined =
    history.at(0);

  let selectedLink = -1;

  let linkTargets: {
    url: string;
    action?: string;
    row: TextRenderable;
  }[] = [];

  const showTargetStatus = (target: (typeof linkTargets)[number]) => {
    status.content =
      target.action === undefined
        ? `${target.url}    Enter to open`
        : `${target.row.plainText}    Enter to activate`;
  };

  let rows: { block: WebsiteBlock; row: TextRenderable; target?: string }[] =
    [];

  let experienceExpanded = false;
  let loadingPage = false;
  const contactFields = new Map<string, string>();
  let soundEnabled = false;
  const openDisclosures = new Set<string>();

  const pageActions = new Map<
    string,
    (action: string, row?: TextRenderable) => void
  >();

  const activatePageAction = (action: string, row?: TextRenderable) => {
    if (loadingPage) {
      return;
    }

    if (soundEnabled && options.renderer === undefined) {
      process.stderr.write("\u0007");
    }

    const key = action.startsWith("disclosure-") ? "disclosure" : action;
    pageActions.get(key)?.(action, row);
  };

  const blockIsVisible = (block: WebsiteBlock) =>
    (block.experienceDetail !== true || experienceExpanded) &&
    (block.disclosure === undefined || openDisclosures.has(block.disclosure));

  let dockRows: { label: string; row: TextRenderable; url: string }[] = [];
  let reflowPage: (() => void) | undefined;
  let displayedBlocks: readonly WebsiteBlock[] = [];
  let displayedLayout: WebsiteLayout | undefined;

  renderer.on("resize", () => {
    reflowPage?.();
  });

  let inputSession: {
    readonly change?: (value: string) => void;
    readonly submit?: (value: string) => void;
    readonly onKey?: (key: KeyEvent) => boolean;
  } | null = null;

  let inlineInput: { frame: BoxRenderable; row: TextRenderable } | null = null;

  let languageOptions: NonNullable<WebsitePage["languages"]> = [];
  let filterQuery = "";
  let languageIndex = 0;
  let matches: TextRenderable[] = [];
  let matchIndex = -1;
  let findQuery = "";

  const find = (query: string) => {
    findQuery = query;
    matches = [];

    for (const { block, row } of rows) {
      const match =
        row.visible &&
        query !== "" &&
        row.plainText.toLocaleLowerCase().includes(query);

      row.bg = match ? colors.match : blockBackground(block.kind, colors.code);

      if (match) {
        matches.push(row);
      }
    }

    matchIndex = matches.length > 0 ? 0 : -1;
    const match = matches.at(matchIndex);

    if (matchIndex >= 0 && match !== undefined) {
      scroll.scrollChildIntoView(match, { inset: 1 });
    }

    status.content =
      query === ""
        ? "Type to find on this page · Escape to close"
        : `${matches.length} matches · Enter to read · n / Shift+n next / previous`;
  };

  search.on("input", () => {
    inputSession?.change?.(search.value);
  });

  const restoreInlineInput = () => {
    if (inlineInput !== null) {
      inlineInput.frame.remove(search);
      inlineInput.row.visible = true;
      chrome.add(search);
      search.focusedBackgroundColor = colors.page;
      inlineInput = null;
    }
  };

  const startInput = (
    session: NonNullable<typeof inputSession>,
    placeholder: string,
    value = "",
    row?: TextRenderable
  ) => {
    restoreInlineInput();
    inputSession = session;
    const frame = row?.parent;

    if (row !== undefined && frame instanceof BoxRenderable) {
      chrome.remove(search);
      row.visible = false;
      frame.add(search);
      search.focusedBackgroundColor = colors.surface;
      inlineInput = { frame, row };
    }

    search.visible = true;
    search.placeholder = placeholder;
    search.value = value;
    search.focus();
  };

  const closeInput = () => {
    inputSession = null;
    search.visible = false;
    restoreInlineInput();
    scroll.focus();
  };

  const openBrowser = (url: string) => {
    if (options.openExternal !== undefined) {
      options.openExternal(url);

      return;
    }

    let command = "xdg-open";

    if (process.platform === "win32") {
      command = "rundll32";
    }

    if (process.platform === "darwin") {
      command = "open";
    }

    const args =
      process.platform === "win32"
        ? ["url.dll,FileProtocolHandler", url]
        : [url];

    const child = spawn(command, args, { stdio: "ignore", windowsHide: true });

    const failed = () => {
      if (!closed) {
        status.content = `Open manually: ${url}`;
      }
    };

    child.on("error", failed);
    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        failed();
      }
    });
    child.unref();
  };

  const spanLabel = ({ action, text }: WebsiteBlock["spans"][number]) => {
    if (action === undefined) {
      return text;
    }

    if (action === "experience" && experienceExpanded) {
      return "See less";
    }

    if (action === "theme" && colors.light) {
      return "☀";
    }

    if (openDisclosures.has(action)) {
      return "▾";
    }

    if (action === "sound" && soundEnabled) {
      return "Sound on";
    }

    const value = contactFields.get(action);

    return value === undefined || value === "" ? text : `${text}: ${value}`;
  };

  const updateRows = () => {
    const palette = colors;

    const selected =
      selectedLink < 0 ? undefined : linkTargets.at(selectedLink);

    const selection = selectedLink;

    for (const { block, row, target } of rows) {
      row.content = new StyledText(
        block.spans.map((span) => {
          const tone = span.tone ?? block.tone ?? "muted";
          let chunk = fg(palette[tone])(spanLabel(span));

          if (
            block.kind === "heading" ||
            block.kind === "subheading" ||
            span.strong === true
          ) {
            chunk = bold(chunk);
          }

          if (span.underline === true) {
            chunk = underline(chunk);
          }

          if (span.url !== undefined) {
            if (target === undefined) {
              chunk = link(span.url)(chunk);
            }

            if (
              selection >= 0 &&
              selected?.row === row &&
              selected.url === span.url
            ) {
              chunk = underline(bold(fg(palette.text)(chunk)));
            }
          }

          return chunk;
        })
      );
    }

    for (const { label, row } of dockRows) {
      row.content =
        selected?.row === row
          ? new StyledText([underline(bold(fg(colors.text)(label)))])
          : label;
    }
  };

  const display = (blocks: readonly WebsiteBlock[], layout?: WebsiteLayout) => {
    displayedBlocks = blocks;
    displayedLayout = layout;

    for (const child of article.getChildren()) {
      child.destroyRecursively();
    }

    rows = [];
    linkTargets = [];
    selectedLink = -1;

    for (const block of blocks) {
      const heading = block.kind === "heading" || block.kind === "subheading";
      const targetUrl = wholeBlockTarget(block);

      const row = new TextRenderable(renderer, {
        bg: blockBackground(block.kind, colors.code),
        marginBottom: block.compact === true ? 0 : 1,
        marginTop: heading && block.compact !== true ? 1 : 0,
        selectable: block.spans.every((span) => span.action === undefined),
        visible: blockIsVisible(block),
        width: "100%",
        wrapMode: "word",
      });

      row.onMouseUp = (event) => {
        const selection = renderer.getSelection();

        const hasRange =
          selection !== null &&
          (selection.anchor.x !== selection.focus.x ||
            selection.anchor.y !== selection.focus.y);

        if (event.button !== 0 || (event.isDragging === true && hasRange)) {
          return;
        }

        const target = targetUrl ?? renderer.getLinkAt(event.x, event.y);

        if (target !== null) {
          const span = block.spans.find((item) => item.url === target);

          if (span?.action !== undefined) {
            activatePageAction(span.action, row);

            return;
          }

          // oxlint-disable-next-line no-use-before-define -- Installed callbacks run after navigation and rendering have both been initialized.
          follow(target);
        }
      };

      if (layout === undefined) {
        article.add(row);
      }

      rows.push({ block, row, target: targetUrl });

      for (const span of block.spans) {
        if (
          span.url !== undefined &&
          !linkTargets.some(
            (target) => target.row === row && target.url === span.url
          )
        ) {
          linkTargets.push({
            action: span.action,
            row,
            url: span.url,
          });
        }
      }
    }

    linkTargets.push(...dockRows.map(({ row, url }) => ({ row, url })));

    reflowPage =
      layout === undefined
        ? undefined
        : mountWebsiteLayout(
            renderer,
            article,
            layout,
            new Map(rows.map(({ row }, index) => [index, row])),
            { ...colors, openDisclosures, origin }
          );

    updateRows();
    scroll.scrollTo(0);
  };

  const toggleTheme = () => {
    closeInput();
    const position = scroll.scrollTop;
    colors = colors === dark ? light : dark;
    renderer.setBackgroundColor(colors.page);

    for (const box of [
      shell,
      chrome,
      toolbar,
      menu,
      scroll,
      article,
      footer,
      dock,
    ]) {
      box.backgroundColor = colors.page;
      const { border } = box;
      box.borderColor = colors.line;
      box.border = border;
    }

    for (const item of [address, status, ...navigation]) {
      item.fg = colors.muted;
    }

    for (const control of [headerVisitors, headerSound, themeControl]) {
      control.fg = colors.muted;
      control.bg = colors.surface;
    }

    for (const [index, item] of navigation.entries()) {
      const name = routes.at(index)?.[0] ?? "";
      item.content =
        index === activeRouteIndex
          ? new StyledText([underline(fg(colors.text)(name))])
          : name;
    }

    for (const child of dock.getChildren()) {
      if (child instanceof TextRenderable) {
        child.fg = colors.muted;
      }
    }

    search.backgroundColor = colors.page;
    search.focusedBackgroundColor = colors.page;
    search.focusedTextColor = colors.text;
    themeControl.content = colors === dark ? " ☾ " : " ☀ ";
    matches = [];
    matchIndex = -1;
    display(displayedBlocks, displayedLayout);

    if (findQuery !== "") {
      find(findQuery);
    }

    scroll.scrollTo(position);
  };

  pageActions.set("theme", toggleTheme);
  pageActions.set("sound", () => {
    soundEnabled = !soundEnabled;
    headerSound.content = soundEnabled ? " ♪ " : " ♪×";
    updateRows();
  });
  pageActions.set("visitors", () => {
    status.content =
      "Visitor activity · Here now — · Joined today — · Total visitors —";
  });
  headerVisitors.onMouseUp = () => {
    activatePageAction("visitors");
  };

  headerSound.onMouseUp = () => {
    activatePageAction("sound");
  };

  pageActions.set("site-search", () => {
    startInput(
      {
        submit: (value) => {
          if (value !== "") {
            const query = new URLSearchParams({
              q: value,
              sitesearch: new URL(siteOrigin).hostname,
            });

            openBrowser(`https://www.google.com/search?${query.toString()}`);
          }
        },
      },
      "Search this site"
    );
  });

  for (const [action, label] of [
    ["contact-name", "Name"],
    ["contact-email", "Email"],
    ["contact-message", "Message"],
  ] as const) {
    pageActions.set(action, () => {
      startInput(
        {
          submit: (value) => {
            contactFields.set(action, value);
            updateRows();
          },
        },
        label,
        contactFields.get(action)
      );
    });
  }

  const refreshVisibility = () => {
    for (const { block, row } of rows) {
      row.visible = blockIsVisible(block);
    }

    reflowPage?.();
    updateRows();

    if (findQuery !== "") {
      find(findQuery);

      return;
    }

    const selected =
      selectedLink < 0 ? undefined : linkTargets.at(selectedLink);

    if (selected?.action !== undefined) {
      showTargetStatus(selected);
    }
  };

  pageActions.set("experience", () => {
    experienceExpanded = !experienceExpanded;
    refreshVisibility();
  });
  pageActions.set("disclosure", (action) => {
    if (!openDisclosures.delete(action)) {
      openDisclosures.add(action);
    }

    refreshVisibility();
  });

  const clearDock = () => {
    for (const child of dock.getChildren()) {
      child.destroyRecursively();
    }

    dockRows = [];
    dock.visible = false;
  };

  const updateBackLink = (back: WebsitePage["back"], home: boolean) => {
    backUrl = back?.url ?? `${origin}/`;
    address.content = `← ${back?.label ?? "Home"}`;
    toolbar.visible = back !== undefined || !home;
  };

  const restoreControls = (page: WebsitePage) => {
    filterQuery = page.filterQuery ?? "";
    languageOptions = page.languages ?? [];

    for (const action of page.openDisclosures ?? []) {
      openDisclosures.add(action);
    }
  };

  const navigate = async (url: string, refresh = false) => {
    loadingPage = true;
    requestController.abort();
    requestController = new AbortController();
    closeInput();
    matches = [];
    matchIndex = -1;
    findQuery = "";
    currentUrl = url;
    revision += 1;
    const request = revision;
    const path = new URL(url).pathname;
    experienceExpanded = false;
    openDisclosures.clear();
    const profilePage = path === "/" || path === "/links";
    updateBackLink(undefined, profilePage);

    const routeIndex = routes.findIndex(
      ([, route]) =>
        route === path || (route !== "/" && path.startsWith(`${route}/`))
    );

    if (routeIndex !== -1) {
      activeRouteIndex = routeIndex;

      for (const [index, item] of navigation.entries()) {
        item.content =
          index === routeIndex
            ? new StyledText([
                underline(bold(fg(colors.text)(routes.at(index)?.[0] ?? ""))),
              ])
            : (routes.at(index)?.[0] ?? "");
      }
    }

    status.content = "Loading…";

    const cached = refresh ? undefined : pageCache.get(url);

    const result = await Effect.runPromise(
      Effect.result(
        cached === undefined
          ? loadPage(url, requestController.signal, origin)
          : Effect.succeed(cached)
      )
    );

    if (closed || request !== revision) {
      return;
    }

    loadingPage = false;
    displayedEntry = history.at(historyIndex);
    clearDock();

    if (result._tag === "Failure") {
      display([
        { kind: "heading", spans: [{ text: profile.name }] },
        { kind: "paragraph", spans: [{ text: profile.description }] },
        {
          kind: "paragraph",
          spans: [{ text: `${result.failure.message} Press r to retry.` }],
        },
        ...links.map((item): WebsiteBlock => ({
          kind: "paragraph",
          spans: [{ text: item.label, url: item.url }],
        })),
      ]);
    } else {
      pageCache.set(url, result.success);
      restoreControls(result.success);

      updateBackLink(result.success.back, profilePage);

      for (const item of result.success.dock) {
        const label = item.label === "Tokscale" ? "AI" : item.label;

        const row = new TextRenderable(renderer, {
          content: item.label === "Tokscale" ? "AI" : item.label,
          fg: colors.muted,
          height: 1,
          onMouseUp: () => {
            // oxlint-disable-next-line no-use-before-define -- Callbacks run after initialization.
            follow(item.url);
          },
        });

        dock.add(row);
        dockRows.push({ label, row, url: item.url });
      }

      dock.visible = result.success.dock.length > 0;
      display(result.success.blocks, result.success.layout);
    }

    status.content = "Tab links · / find · m pages · t theme · ? help · q quit";
    scroll.focus();
  };

  const follow = (url: string) => {
    if (new URL(url).origin !== origin) {
      openBrowser(url);

      return;
    }

    if (url !== currentUrl) {
      history.splice(historyIndex + 1);
      const previous = displayedEntry;

      if (previous !== undefined) {
        previous.scroll = scroll.scrollTop;
      }

      history.push({ scroll: 0, url });
      historyIndex = history.length - 1;
    }

    void navigate(url);
  };

  const applyFilter = (param: string, value: string) => {
    const target = new URL(currentUrl);
    target.searchParams.delete(param);

    if (value !== "") {
      target.searchParams.set(
        param,
        param === "q" ? encodeSearchQuery(value) : value
      );
    }

    follow(target.href);
  };

  const cycleLanguage = (key: KeyEvent) => {
    if (key.name !== "up" && key.name !== "down") {
      return false;
    }

    const count = languageOptions.length;

    if (count > 0) {
      languageIndex =
        (languageIndex + (key.name === "down" ? 1 : count - 1)) % count;
      search.value = languageOptions.at(languageIndex)?.label ?? "";
    }

    return true;
  };

  pageActions.set("filter-query", (_action, row) => {
    startInput(
      {
        submit: (value) => {
          applyFilter("q", value);
        },
      },
      "Search…",
      filterQuery,
      row
    );
    status.content = "Enter to apply · Escape to cancel";
  });
  pageActions.set("filter-language", (_action, row) => {
    const current = new URL(currentUrl).searchParams.get("language") ?? "";
    languageIndex = Math.max(
      0,
      languageOptions.findIndex((option) => option.value === current)
    );
    startInput(
      {
        onKey: cycleLanguage,
        submit: () => {
          applyFilter(
            "language",
            languageOptions.at(languageIndex)?.value ?? ""
          );
        },
      },
      "Language",
      languageOptions.at(languageIndex)?.label ?? "",
      row
    );
    status.content = "Up / Down choose language · Enter to apply";
  });

  const restoreHistory = async (entry: { url: string; scroll: number }) => {
    await navigate(entry.url);

    if (!closed && currentUrl === entry.url) {
      scroll.scrollTo(entry.scroll);
    }
  };

  const moveHistory = (direction: number) => {
    const next = historyIndex + direction;
    const entry = history.at(next);

    if (next >= 0 && next < history.length && entry !== undefined) {
      const previous = displayedEntry;

      if (previous !== undefined) {
        previous.scroll = scroll.scrollTop;
      }

      historyIndex = next;
      void restoreHistory(entry);
    }
  };

  const movePage = (direction: number) => {
    const index =
      (activeRouteIndex + direction + routes.length) % routes.length;

    const route = routes.at(index);

    if (route !== undefined) {
      follow(new URL(route[1], origin).href);
    }
  };

  const focusLink = (direction: number) => {
    const visible = linkTargets.flatMap((target, index) =>
      target.row.visible ? [index] : []
    );

    if (visible.length === 0) {
      return;
    }

    const initial = direction < 0 ? 0 : -1;
    const current = visible.indexOf(selectedLink);
    const previous = current === -1 ? initial : current;
    selectedLink =
      visible[(previous + direction + visible.length) % visible.length] ?? -1;
    const target = linkTargets.at(selectedLink);
    updateRows();

    if (target !== undefined) {
      if (!dockRows.some(({ row }) => row === target.row)) {
        scroll.scrollChildIntoView(target.row, { inset: 1 });
      }

      showTargetStatus(target);
    }

    scroll.focus();
  };

  const openSelected = () => {
    if (selectedLink < 0) {
      return;
    }

    const target = linkTargets.at(selectedLink);

    if (target?.row.visible === true) {
      if (target.action !== undefined) {
        activatePageAction(target.action, target.row);

        return;
      }

      follow(target.url);
    }
  };

  const actions = new Map<string, () => void>([
    ["t", toggleTheme],
    [
      "m",
      () => {
        menu.visible = !menu.visible;
      },
    ],
    [
      "/",
      () => {
        startInput(
          {
            change: (query) => {
              find(query.trim().toLocaleLowerCase());
            },
          },
          "Find on page…"
        );
      },
    ],
    [
      "?",
      () => {
        status.content =
          "/ find · Ctrl+L address · r reload · b/f history · o browser · q quit";
      },
    ],
    [
      "q",
      () => {
        renderer.destroy();
      },
    ],
    [
      "r",
      () => {
        void navigate(currentUrl, true);
      },
    ],
    [
      "o",
      () => {
        openBrowser(currentUrl);
      },
    ],
    [
      "b",
      () => {
        moveHistory(-1);
      },
    ],
    [
      "backspace",
      () => {
        moveHistory(-1);
      },
    ],
    [
      "escape",
      () => {
        moveHistory(-1);
      },
    ],
    [
      "f",
      () => {
        moveHistory(1);
      },
    ],
    [
      "left",
      () => {
        movePage(-1);
      },
    ],
    [
      "right",
      () => {
        movePage(1);
      },
    ],
    ["return", openSelected],
  ]);

  const handleInput = (key: KeyEvent) => {
    if (inputSession?.onKey?.(key) === true) {
      key.preventDefault();

      return;
    }

    if (key.name === "escape") {
      key.preventDefault();
      closeInput();

      return;
    }

    if (key.name === "return") {
      key.preventDefault();
      const submit = inputSession?.submit;
      const value = search.value.trim();
      closeInput();
      submit?.(value);
    }
  };

  const submitAddress = (value: string) => {
    if (value !== "" && URL.canParse(value, origin)) {
      const target = new URL(value, origin);

      if (["http:", "https:"].includes(target.protocol)) {
        follow(target.href);
      }
    }
  };

  renderer.keyInput.on("keypress", (key) => {
    if (inputSession !== null) {
      handleInput(key);

      return;
    }

    if (key.ctrl && key.name === "l") {
      key.preventDefault();
      startInput({ submit: submitAddress }, "Enter a page path, e.g. /blog");

      return;
    }

    if (key.name === "n" && matches.length > 0) {
      matchIndex =
        (matchIndex + (key.shift ? matches.length - 1 : 1)) % matches.length;
      const match = matches.at(matchIndex);

      if (match !== undefined) {
        scroll.scrollChildIntoView(match, { inset: 1 });
      }

      status.content = `Match ${matchIndex + 1} of ${matches.length}`;

      return;
    }

    if (key.name === "tab") {
      key.preventDefault();
      focusLink(key.shift ? -1 : 1);

      return;
    }

    const action = actions.get(key.name);

    if (action !== undefined) {
      key.preventDefault();
      action();
    }
  });
  await navigate(currentUrl);
};
