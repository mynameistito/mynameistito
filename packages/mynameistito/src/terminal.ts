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
  line: "#303438",
  match: "#1b2026",
  muted: "#a1a4a6",
  page: "#101112",
  text: "#f1f2f2",
};

const light = {
  accent: "#3f6798",
  code: "#eceff1",
  line: "#e0e3e4",
  match: "#dce7f3",
  muted: "#5f6568",
  page: "#f7f8f8",
  text: "#17191a",
};

/** Start the terminal portfolio with semantic page content and browser navigation.
 * @param options - Optional renderer and page loader for embedded terminals and deterministic checks.
 * @returns A promise resolved when the first page has loaded.
 */
export const startTerminal = async (
  options: {
    readonly renderer?: CliRenderer;
    readonly loadPage?: typeof fetchWebsitePage;
    readonly openExternal?: (url: string) => void;
  } = {}
): Promise<void> => {
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

  const address = new TextRenderable(renderer, {
    content: "",
    fg: colors.muted,
    flexGrow: 1,
    height: 1,
    onMouseUp: () => {
      // oxlint-disable-next-line no-use-before-define -- Callbacks run after initialization.
      follow(`${siteOrigin}/`);
    },
  });

  const toolbar = new BoxRenderable(renderer, {
    flexDirection: "row",
    height: 2,
    width: "100%",
  });

  toolbar.add(address);

  const themeControl = new TextRenderable(renderer, {
    content: "☀",
    fg: colors.muted,
    height: 1,
    onMouseUp: () => {
      // oxlint-disable-next-line no-use-before-define -- Callbacks run after initialization.
      toggleTheme();
    },
    width: 3,
  });

  toolbar.add(themeControl);
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
        follow(new URL(path, siteOrigin).href);
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

  let currentUrl = `${siteOrigin}/`;
  const history = [{ scroll: 0, url: currentUrl }];
  let historyIndex = 0;

  let displayedEntry: { scroll: number; url: string } | undefined =
    history.at(0);

  let selectedLink = -1;

  let linkTargets: { url: string; browser?: boolean; row: TextRenderable }[] =
    [];

  let rows: { block: WebsiteBlock; row: TextRenderable }[] = [];
  let dockRows: { label: string; row: TextRenderable; url: string }[] = [];
  let reflowPage: (() => void) | undefined;
  let displayedBlocks: readonly WebsiteBlock[] = [];
  let displayedLayout: WebsiteLayout | undefined;

  renderer.on("resize", () => {
    reflowPage?.();
  });
  let inputMode: "find" | "address" | null = null;
  let matches: TextRenderable[] = [];
  let matchIndex = -1;

  const find = () => {
    const query = search.value.trim().toLocaleLowerCase();
    matches = [];

    for (const { row } of rows) {
      const match =
        query !== "" && row.plainText.toLocaleLowerCase().includes(query);

      row.bg = match ? colors.match : colors.page;

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
    if (inputMode === "find") {
      find();
    }
  });

  const startInput = (mode: "find" | "address") => {
    inputMode = mode;
    search.visible = true;
    search.placeholder =
      mode === "find" ? "Find on page…" : "Enter a page path, e.g. /blog";
    search.value = "";
    search.focus();
  };

  const closeInput = () => {
    inputMode = null;
    search.visible = false;
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

  const updateRows = () => {
    const palette = colors;
    const selected = linkTargets.at(selectedLink);
    const selection = selectedLink;

    for (const { block, row } of rows) {
      row.content = new StyledText(
        block.spans.map((span) => {
          let color = block.tone === "text" ? palette.text : palette.muted;

          if (span.url !== undefined) {
            color = palette.accent;
          }

          let chunk = fg(color)(span.text);

          if (
            block.kind === "heading" ||
            block.kind === "subheading" ||
            span.strong === true
          ) {
            chunk = bold(fg(palette.text)(chunk));
          }

          if (span.url !== undefined) {
            chunk = link(span.url)(chunk);

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

      const row = new TextRenderable(renderer, {
        bg: block.kind === "code" ? colors.code : colors.page,
        marginBottom: block.compact === true ? 0 : 1,
        marginTop: heading && block.compact !== true ? 1 : 0,
        onMouseUp: (event) => {
          if (event.isDragging === true || event.button !== 0) {
            return;
          }

          const target = renderer.getLinkAt(event.x, event.y);

          if (target !== null) {
            const span = block.spans.find((item) => item.url === target);

            if (span?.browser === true) {
              openBrowser(target);

              return;
            }

            // oxlint-disable-next-line no-use-before-define -- Installed callbacks run after navigation and rendering have both been initialized.
            follow(target);
          }
        },
        width: "100%",
        wrapMode: "word",
      });

      if (layout === undefined) {
        article.add(row);
      }

      rows.push({ block, row });

      for (const span of block.spans) {
        if (
          span.url !== undefined &&
          !linkTargets.some(
            (target) => target.row === row && target.url === span.url
          )
        ) {
          linkTargets.push({ browser: span.browser, row, url: span.url });
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
            colors
          );

    updateRows();
    scroll.scrollTo(0);
  };

  const toggleTheme = () => {
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

    for (const item of [address, status, themeControl, ...navigation]) {
      item.fg = colors.muted;
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
    themeControl.content = colors === dark ? "☀" : "☾";
    matches = [];
    matchIndex = -1;
    display(displayedBlocks, displayedLayout);
    scroll.scrollTo(position);
  };

  const clearDock = () => {
    for (const child of dock.getChildren()) {
      child.destroyRecursively();
    }

    dockRows = [];
    dock.visible = false;
  };

  const navigate = async (url: string, refresh = false) => {
    requestController.abort();
    requestController = new AbortController();
    closeInput();
    matches = [];
    matchIndex = -1;
    currentUrl = url;
    revision += 1;
    const request = revision;
    const path = new URL(url).pathname;
    address.content = path === "/" ? "" : "← Home";

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
          ? loadPage(url, requestController.signal)
          : Effect.succeed(cached)
      )
    );

    if (closed || request !== revision) {
      return;
    }

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
    if (new URL(url).origin !== siteOrigin) {
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
      follow(new URL(route[1], siteOrigin).href);
    }
  };

  const focusLink = (direction: number) => {
    if (linkTargets.length === 0) {
      return;
    }

    const initial = direction < 0 ? 0 : -1;
    const previous = selectedLink < 0 ? initial : selectedLink;
    selectedLink =
      (previous + direction + linkTargets.length) % linkTargets.length;
    const target = linkTargets.at(selectedLink);
    updateRows();

    if (target !== undefined) {
      if (!dockRows.some(({ row }) => row === target.row)) {
        scroll.scrollChildIntoView(target.row, { inset: 1 });
      }

      status.content = `${target.url}    Enter to open`;
    }

    scroll.focus();
  };

  const openSelected = () => {
    if (selectedLink < 0) {
      return;
    }

    const target = linkTargets.at(selectedLink);

    if (target !== undefined) {
      if (target.browser === true) {
        openBrowser(target.url);

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
        startInput("find");
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
    if (key.name === "escape") {
      key.preventDefault();
      closeInput();

      return;
    }

    if (key.name === "return") {
      key.preventDefault();
      const mode = inputMode;
      const value = search.value.trim();
      closeInput();

      if (
        mode === "address" &&
        value !== "" &&
        URL.canParse(value, siteOrigin)
      ) {
        const target = new URL(value, siteOrigin);

        if (["http:", "https:"].includes(target.protocol)) {
          follow(target.href);
        }
      }
    }
  };

  renderer.keyInput.on("keypress", (key) => {
    if (inputMode !== null) {
      handleInput(key);

      return;
    }

    if (key.ctrl && key.name === "l") {
      key.preventDefault();
      startInput("address");

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
