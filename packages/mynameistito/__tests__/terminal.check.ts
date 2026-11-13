import assert from "node:assert/strict";

import { createTestRenderer } from "@opentui/core/testing";
import { Effect } from "effect";

import { startTerminal } from "../src/terminal.js";
import { parseWebsitePage, WebsiteUnavailable } from "../src/website.js";

const terminal = await createTestRenderer({ height: 28, width: 100 });

const pageHtml = `<title>Home | Tito</title><main><h1>Tito</h1>
  <p>I build <strong>useful tools</strong>. Read my <a href="/blog/hello">first post</a> or <a href="/about">about me</a>.</p>
  <h2>Experience</h2><p>Developer from New Zealand.</p></main>`;

const postHtml = `<title>Hello | Tito</title><main><h1>First post</h1><p>A place for ideas.</p></main>`;
const opened: string[] = [];

try {
  await startTerminal({
    loadPage: (url) => {
      let html = pageHtml;

      if (url.endsWith("/blog/hello")) {
        html = postHtml;
      }

      if (url.endsWith("/about")) {
        html = "<main><h1>About Tito</h1><p>About page content.</p></main>";
      }

      if (url.endsWith("/contact")) {
        html = "<main><h1>Contact Tito</h1><form>Send</form></main>";
      }

      if (url.endsWith("/packages")) {
        html =
          '<main><h1>Packages</h1><ul class="border-t"><li class="border-b"><article class="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"><div class="grid gap-1"><div class="flex gap-x-2"><a class="font-semibold" href="https://npmjs.com/package/example">example</a><span>v1.2.3</span></div><p class="m-0">A useful package.</p></div><div class="flex gap-3"><span>123 weekly downloads</span><a href="https://github.com/example">Repository</a></div></article></li></ul></main><nav aria-label="Portfolio links"><a aria-label="GitHub" href="https://github.com/mynameistito"></a><a aria-label="Links" href="/links"></a></nav>';
      }

      const page = parseWebsitePage(html, url);

      return page === null
        ? Effect.fail(new WebsiteUnavailable({ message: "Missing fixture" }))
        : Effect.succeed(page);
    },
    openExternal: (url) => {
      opened.push(url);
    },
    renderer: terminal.renderer,
  });
  await terminal.flush();
  assert.match(
    terminal.captureCharFrame(),
    /I build useful tools\. Read my first post or about me\./u
  );
  terminal.mockInput.pressKey("/");
  await terminal.mockInput.typeText("useful");
  await terminal.flush();
  assert.match(terminal.captureCharFrame(), /1 matches/u);
  terminal.mockInput.pressEscape();
  await terminal.flush();
  const frame = terminal.captureCharFrame().split("\n");
  const row = frame.findIndex((line) => line.includes("about me"));
  assert.ok(row !== -1);
  const column = frame.at(row)?.indexOf("about me") ?? -1;
  assert.ok(column >= 0);
  await terminal.mockMouse.click(column + 2, row);
  await terminal.waitForFrame((text) => text.includes("About page content."));
  terminal.mockInput.pressKey("b");
  await terminal.waitForFrame((text) => text.includes("Experience"));
  terminal.mockInput.pressTab();
  await terminal.flush();
  assert.match(terminal.captureCharFrame(), /Enter to open/u);
  terminal.mockInput.pressEnter();
  await terminal.waitForFrame((text) => text.includes("A place for ideas."));
  terminal.mockInput.pressKey("b");
  await terminal.waitForFrame((text) => text.includes("Experience"));
  terminal.mockInput.pressKey("f");
  await terminal.waitForFrame((text) => text.includes("A place for ideas."));
  terminal.resize(44, 20);
  await terminal.flush();
  assert.match(terminal.captureCharFrame(), /First post/u);
  terminal.mockInput.pressKey("l", { ctrl: true });
  await terminal.mockInput.typeText("/contact");
  terminal.mockInput.pressEnter();
  await terminal.waitForFrame((text) => text.includes("Contact Tito"));
  terminal.mockInput.pressTab();
  terminal.mockInput.pressEnter();
  await terminal.flush();
  assert.deepEqual(opened, ["https://mynameistito.com/contact"]);
  terminal.resize(100, 28);
  terminal.mockInput.pressKey("l", { ctrl: true });
  await terminal.mockInput.typeText("/packages");
  terminal.mockInput.pressEnter();
  await terminal.waitForFrame((text) => text.includes("A useful package."));
  const wideRows = terminal.captureCharFrame().split("\n");
  assert.ok(wideRows.some((line) => /example\s+v1\.2\.3/u.test(line)));
  assert.ok(
    wideRows.some((line) =>
      /A useful package\..*123 weekly downloads/u.test(line)
    )
  );
  assert.match(terminal.captureCharFrame(), /GitHub\s+Links/u);
  terminal.mockInput.pressTab({ shift: true });
  await terminal.flush();
  assert.match(
    terminal.captureCharFrame(),
    /https:\/\/mynameistito.com\/links/u
  );
  terminal.mockInput.pressTab({ shift: true });
  terminal.mockInput.pressEnter();
  await terminal.flush();
  assert.equal(opened.at(-1), "https://github.com/mynameistito");
  terminal.mockInput.pressKey("t");
  await terminal.flush();
  assert.match(terminal.captureCharFrame(), /☾/u);
  assert.match(terminal.captureCharFrame(), /A useful package\./u);
  terminal.resize(44, 24);
  await terminal.flush();
  assert.match(terminal.captureCharFrame(), /123 weekly downloads/u);
  assert.match(terminal.captureCharFrame(), /v1\.2\.3/u);
  terminal.mockInput.pressKey("m");
  await terminal.flush();
  assert.match(terminal.captureCharFrame(), /Open source/u);
  console.log(
    "Terminal checks passed: links, search, history, browser actions, website rows, responsive layout, social dock, theme, and page menu."
  );
} finally {
  await terminal.dispose();
}
