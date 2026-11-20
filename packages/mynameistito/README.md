# mynameistito

A terminal edition of Tito's website, built with OpenTUI. Pages are read from the published website so profile text, projects, packages, and blog posts stay current.

```bash
npx mynameistito
```

```bash
bunx --bun mynameistito
```

The interactive interface requires Bun 1.3.14+ (1.4+ on Windows ARM64), or Node 26.4+ launched with `--experimental-ffi`. `npx` automatically launches an installed Bun runtime when Node cannot run OpenTUI. If Bun is unavailable, it prints the profile card and instructions for starting the interactive interface.

The renderer preserves the website's nested sections, rows, cards, borders, spacing, inline emphasis, and links. Experience dates and package metadata stay beside their associated content; responsive rows stack in narrow terminals. Raster images, including the avatar, render through OpenTUI's available image protocol, with a text fallback if loading fails. The social dock comes from the website's markup, and `t` switches between its dark and light palettes.

Use Up/Down or the mouse wheel to scroll, Left/Right to switch pages, and Tab/Shift+Tab to highlight links in the page. Enter follows the highlighted link. Links and navigation also support mouse clicks. Press `/` to find text, Enter to finish searching, and `n`/Shift+N to visit subsequent matches. Ctrl+L lets you enter a page path such as `/blog`.

Press `m` to reveal the page menu; click a page name or use Left/Right to browse. Press `b`, Backspace, or Escape to go back; `f` goes forward. Browsed pages are cached for the session, and history restores the previous scroll position. Press `r` to reload from the website, `o` to open the current page in your browser, and `q` or Ctrl+C to exit. `?` shows additional shortcuts.

External links open in your browser. The contact page includes an explicit link to open its browser-verified message form. Graphics and audio use the browser edition at https://mynameistito.com. Terminal cell sizes and supported image protocols determine visual fidelity; browser fonts, SVGs, WebGL scenes, and browser-only interactions are not reproduced exactly.

If the website is unavailable, the interface shows the bundled profile and links. Piped output and `--plain` always print the profile card without network access.

## Exports

```ts
import { links, profile } from "mynameistito";
```

## Development

```bash
bun install
bun --filter mynameistito run dev
```

Run `bun run --cwd packages/mynameistito test:terminal` for native terminal checks, including inline links, back/forward history, and a narrow terminal layout.
