import assert from "node:assert/strict";
// oxlint-disable-next-line vitest/no-import-node-test -- OpenTUI requires Bun's native runtime; this suite runs with bun test.
import { test as nativeTest } from "node:test";

import { createTestRenderer } from "@opentui/core/testing";
import { Deferred, Effect } from "effect";

import { startTerminal } from "../src/terminal.js";
import { parseWebsitePage, WebsiteUnavailable } from "../src/website.js";

await nativeTest(
  "filters keep literal queries and ignore controls during navigation",
  async () => {
    const terminal = await createTestRenderer({ height: 28, width: 100 });
    const requested: URL[] = [];

    const about = parseWebsitePage(
      "<main><h1>About Tito</h1></main>",
      "https://mynameistito.com/about"
    );

    assert.ok(about);
    const pending = Effect.runSync(Deferred.make<typeof about>());

    const filters =
      '<main><h1>Projects</h1><label for="project-search">Search projects<input id="project-search"></label></main>';

    try {
      await startTerminal({
        loadPage: (url) => {
          const target = new URL(url);
          requested.push(target);

          if (target.pathname === "/about") {
            return Deferred.await(pending);
          }

          const page = parseWebsitePage(filters, url);
          assert.ok(page);

          return Effect.succeed(page);
        },
        renderer: terminal.renderer,
      });
      terminal.mockInput.pressTab();
      terminal.mockInput.pressEnter();
      await terminal.mockInput.typeText("[1]");
      terminal.mockInput.pressEnter();
      await terminal.flush();
      assert.equal(requested.at(-1)?.searchParams.get("q"), '"[1]"');

      terminal.mockInput.pressKey("l", { ctrl: true });
      await terminal.mockInput.typeText("/about");
      terminal.mockInput.pressEnter();
      await terminal.flush();
      assert.equal(requested.at(-1)?.pathname, "/about");
      terminal.mockInput.pressTab();
      terminal.mockInput.pressEnter();
      await terminal.flush();
      assert.doesNotMatch(terminal.captureCharFrame(), /Enter to apply/u);
      assert.equal(requested.length, 3);
      await Effect.runPromise(Deferred.succeed(pending, about));
      await terminal.waitForFrame((text) => text.includes("About Tito"));
    } finally {
      await Effect.runPromise(Deferred.succeed(pending, about));
      await terminal.dispose();
    }
  }
);

await nativeTest(
  "home project rows wrap and experience details toggle in place",
  async () => {
    const terminal = await createTestRenderer({ height: 34, width: 58 });

    const html = `<main><h1>Tito</h1>
      <section aria-labelledby="experience-title">
        <div class="flex justify-between"><h2 id="experience-title">Experience</h2><button aria-expanded="false">See more</button></div>
        <ul><li class="border-b"><div class="grid grid-cols-[minmax(0,1fr)_auto]">
          <div><h3><a href="https://kzg.gg">KZG</a></h3><p class="m-0">COO</p></div>
          <p class="m-0">Present</p>
          <ul data-experience-highlights hidden><li>I work on game servers and the systems around them.</li></ul>
        </div></li></ul>
      </section>
      <section><h2>Projects</h2><a href="/projects/example" class="grid grid-cols-[minmax(0,1fr)_auto]">
      <span class="grid"><span class="flex">Example project</span><span>A long project description that wraps through to the final words.</span></span>
      <svg class="lucide-arrow-up-right" aria-hidden="true"></svg></a></section>
      <pre>sample command</pre></main>`;

    try {
      await startTerminal({
        loadPage: (url) => {
          const page = parseWebsitePage(html, url);
          assert.ok(page);

          return Effect.succeed(page);
        },
        renderer: terminal.renderer,
      });
      await terminal.flush();
      const frame = terminal.captureCharFrame();
      assert.match(frame, /COO +Present/u);
      assert.match(frame, /final words\./u);
      assert.match(frame, /↗/u);
      assert.doesNotMatch(frame, /systems around them/u);
      terminal.mockInput.pressKey("/");
      await terminal.mockInput.typeText("systems around");
      await terminal.flush();
      assert.match(terminal.captureCharFrame(), /0 matches/u);

      const codeStyle = terminal
        .captureSpans()
        .lines.flatMap((line) => line.spans)
        .find((span) => span.text.includes("sample command"));

      assert.deepEqual(codeStyle?.bg.toInts().slice(0, 3), [24, 27, 29]);
      terminal.mockInput.pressEnter();
      await terminal.flush();
      const lines = terminal.captureCharFrame().split("\n");
      const y = lines.findIndex((line) => line.includes("See more"));
      const x = lines.at(y)?.indexOf("See more") ?? -1;
      assert.ok(y !== -1);
      assert.ok(x >= 0);
      await terminal.mockMouse.click(x + 1, y);
      await terminal.waitForFrame((text) => text.includes("See less"));
      assert.match(terminal.captureCharFrame(), /systems around them/u);
      assert.match(terminal.captureCharFrame(), /1 matches/u);
      terminal.mockInput.pressKey("t");
      terminal.mockInput.pressKey("n");
      await terminal.flush();
      assert.match(terminal.captureCharFrame(), /Match 1 of 1/u);
      terminal.mockInput.pressTab();
      terminal.mockInput.pressEnter();
      await terminal.waitForFrame((text) => text.includes("See more"));
      assert.doesNotMatch(terminal.captureCharFrame(), /systems around them/u);
      assert.match(terminal.captureCharFrame(), /0 matches/u);
    } finally {
      await terminal.dispose();
    }
  }
);

await nativeTest(
  "terminal navigation, layout, themes and native filtering",
  async () => {
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
          const target = new URL(url);

          if (url.endsWith("/blog/hello")) {
            html = postHtml;
          }

          if (url.endsWith("/about")) {
            html = "<main><h1>About Tito</h1><p>About page content.</p></main>";
          }

          if (url.endsWith("/contact")) {
            html =
              '<main><h1>Contact Tito</h1><form><label for="name">Name<input id="name"></label><label for="message">Message<textarea id="message"></textarea></label><button type="submit" disabled>Send</button><p role="status">Unavailable</p></form></main>';
          }

          if (target.pathname === "/projects") {
            html =
              '<main><h1>Projects</h1><div><label for="project-search">Search projects<input id="project-search"></label><label>Language<select id="project-language"><option value="">All languages</option><option value="TypeScript">TypeScript</option></select></label></div></main>';
          }

          if (target.pathname === "/open-source") {
            html =
              '<main><h1>Open source</h1><details><summary class="flex"><span class="grid flex-1"><span>Example repository</span><span>owner/example</span></span></summary><p>Pull request title</p></details></main>';
          }

          if (url.endsWith("/packages")) {
            html =
              '<main><h1>Packages</h1><ul class="border-t"><li class="border-b"><article class="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto]"><div class="grid gap-1"><div class="flex gap-x-2"><a class="font-semibold" href="https://npmjs.com/package/example">example</a><span>v1.2.3</span></div><p class="m-0">A useful package.</p></div><div class="flex gap-3"><span>123 weekly downloads</span><a href="https://github.com/example">Repository</a></div></article></li></ul></main><nav aria-label="Portfolio links"><a aria-label="GitHub" href="https://github.com/mynameistito"></a><a aria-label="Links" href="/links"></a></nav>';
          }

          const page = parseWebsitePage(html, url);

          return page === null
            ? Effect.fail(
                new WebsiteUnavailable({ message: "Missing fixture" })
              )
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
      await terminal.waitForFrame((text) =>
        text.includes("About page content.")
      );
      terminal.mockInput.pressKey("b");
      await terminal.waitForFrame((text) => text.includes("Experience"));
      terminal.mockInput.pressTab();
      await terminal.flush();
      assert.match(terminal.captureCharFrame(), /Enter to open/u);
      terminal.mockInput.pressEnter();
      await terminal.waitForFrame((text) =>
        text.includes("A place for ideas.")
      );
      terminal.mockInput.pressKey("b");
      await terminal.waitForFrame((text) => text.includes("Experience"));
      terminal.mockInput.pressKey("f");
      await terminal.waitForFrame((text) =>
        text.includes("A place for ideas.")
      );
      terminal.resize(44, 20);
      await terminal.flush();
      assert.match(terminal.captureCharFrame(), /First post/u);
      terminal.mockInput.pressKey("l", { ctrl: true });
      await terminal.mockInput.typeText("/contact");
      terminal.mockInput.pressEnter();
      await terminal.waitForFrame((text) => text.includes("Contact Tito"));
      terminal.mockInput.pressTab();
      terminal.mockInput.pressEnter();
      await terminal.mockInput.typeText("Tito");
      terminal.mockInput.pressEnter();
      await terminal.flush();
      assert.match(terminal.captureCharFrame(), /Name: Tito/u);
      assert.deepEqual(opened, []);
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
      assert.deepEqual(opened, ["https://github.com/mynameistito"]);
      terminal.mockInput.pressKey("t");
      await terminal.flush();
      assert.match(terminal.captureCharFrame(), /☀/u);
      assert.match(terminal.captureCharFrame(), /A useful package\./u);
      terminal.resize(44, 24);
      await terminal.flush();
      assert.match(terminal.captureCharFrame(), /123 weekly downloads/u);
      assert.match(terminal.captureCharFrame(), /v1\.2\.3/u);
      terminal.mockInput.pressKey("m");
      await terminal.flush();
      assert.match(terminal.captureCharFrame(), /Open source/u);
      terminal.mockInput.pressKey("l", { ctrl: true });
      await terminal.mockInput.typeText("/projects");
      terminal.mockInput.pressEnter();
      await terminal.waitForFrame((text) => text.includes("Search projects"));
      terminal.mockInput.pressTab();
      terminal.mockInput.pressEnter();
      await terminal.mockInput.typeText("test");
      terminal.mockInput.pressEnter();
      await terminal.waitForFrame((text) =>
        text
          .split("\n")
          .some((line) => line.trim() === "│ test" || /│ test\s*│/u.test(line))
      );
      terminal.mockInput.pressTab();
      terminal.mockInput.pressTab();
      terminal.mockInput.pressEnter();
      terminal.mockInput.pressArrow("down");
      terminal.mockInput.pressEnter();
      await terminal.waitForFrame((text) => text.includes("TypeScript ▾"));
      terminal.mockInput.pressKey("l", { ctrl: true });
      await terminal.mockInput.typeText("/open-source");
      terminal.mockInput.pressEnter();
      await terminal.waitForFrame((text) =>
        text.includes("Example repository")
      );
      const repositoryRows = terminal.captureCharFrame().split("\n");

      const slugRow = repositoryRows.find((line) =>
        line.includes("owner/example")
      );

      assert.ok(slugRow !== undefined);
      assert.doesNotMatch(slugRow, /Example repository/u);
      assert.doesNotMatch(terminal.captureCharFrame(), /Pull request title/u);
      terminal.mockInput.pressTab();
      terminal.mockInput.pressEnter();
      await terminal.waitForFrame((text) =>
        text.includes("Pull request title")
      );
      console.log(
        "Terminal checks passed: links, search, history, browser actions, website rows, responsive layout, social dock, theme, and page menu."
      );
    } finally {
      await terminal.dispose();
    }
  }
);
