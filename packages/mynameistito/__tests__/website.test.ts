import { describe, expect, it } from "vitest";

import { parseWebsitePage } from "../src/website.js";

describe("terminal website translation", () => {
  it("preserves indentation at both code block boundaries", () => {
    const page = parseWebsitePage(
      "<main><pre>  first\n    last  </pre></main>",
      "https://mynameistito.com/"
    );

    expect(page?.blocks[0]?.spans.map((span) => span.text).join("")).toBe(
      "  first\n    last  "
    );
  });

  it("preserves heading hierarchy, emphasis, and inline link punctuation", () => {
    const page = parseWebsitePage(
      '<main><h1>Tito</h1><p>I build <strong>tools</strong>. Read the <a href="/blog">blog</a>.</p><h2>Experience</h2><p>New Zealand</p></main>',
      "https://mynameistito.com/"
    );

    expect(page?.blocks.map((block) => block.kind)).toStrictEqual([
      "heading",
      "paragraph",
      "subheading",
      "paragraph",
    ]);
    expect(
      page?.blocks
        .at(1)
        ?.spans.map((span) => span.text)
        .join("")
    ).toBe("I build tools. Read the blog.");
    expect(
      page?.blocks.at(1)?.spans.find((span) => span.text === "tools")?.strong
    ).toBeTruthy();
    expect(
      page?.blocks.at(1)?.spans.find((span) => span.text === "blog")?.url
    ).toBe("https://mynameistito.com/blog");
  });

  it("reads page content and resolves article and project links", () => {
    const page = parseWebsitePage(
      `<title>Blog | Tito</title><nav>Outside</nav>
      <main><nav aria-label="Page controls">Back</nav><h1>Blog</h1><p>Ideas &amp; experiments.</p>
      <a href="/blog/hello">Hello</a><a href="/blog/hello">Duplicate</a>
      <a href="https://github.com/mynameistito">GitHub</a>
      <script>private script</script><svg>drawing</svg>
      <span aria-hidden="true">hidden</span><button>Submit</button></main>`,
      "https://mynameistito.com/blog"
    );

    expect(page?.title).toBe("Blog | Tito");
    expect(page?.text).toContain("Blog\n\nIdeas & experiments.");
    expect(page?.text).not.toMatch(
      /Outside|Back|private script|drawing|hidden|Submit/u
    );
    expect(page?.links).toStrictEqual([
      { label: "Hello", url: "https://mynameistito.com/blog/hello" },
      { label: "GitHub", url: "https://github.com/mynameistito" },
    ]);
  });

  it("retains social navigation, profile headers, and a working browser action for forms", () => {
    const page = parseWebsitePage(
      '<main><header><h1>Tito</h1></header><nav aria-label="Social links"><a href="https://discord.com/users/1">Discord</a><a href="/blog">Writing</a></nav><form><label>Email<input></label></form></main>',
      "https://mynameistito.com/contact"
    );

    expect(page?.links.map((item) => item.label)).toStrictEqual([
      "Discord",
      "Writing",
    ]);
    expect(page?.blocks.at(0)?.kind).toBe("heading");
    expect(
      page?.blocks
        .flatMap((block) => block.spans)
        .find((span) => span.browser === true)
    ).toMatchObject({ browser: true, url: "https://mynameistito.com/contact" });
  });

  it("preserves line breaks and code indentation", () => {
    const page = parseWebsitePage(
      "<main><h1>Code</h1><pre><code>one\n  two</code></pre><p>Line one<br>Line two</p></main>",
      "https://mynameistito.com/blog/code"
    );

    expect(
      page?.blocks
        .find((block) => block.kind === "code")
        ?.spans.map((span) => span.text)
        .join("")
    ).toBe("one\n  two");
    expect(
      page?.blocks
        .at(-1)
        ?.spans.map((span) => span.text)
        .join("")
    ).toBe("Line one\nLine two");
  });

  it("rejects non-page responses and unsafe links, and strips terminal controls", () => {
    expect(
      parseWebsitePage("<h1>Unavailable</h1>", "https://mynameistito.com")
    ).toBeNull();

    const page = parseWebsitePage(
      '<main><p>Hi\u001B there</p><a href="javascript:alert(1)">Bad</a><a href="data:text/html,x">Data</a></main>',
      "https://mynameistito.com"
    );

    expect(page?.links).toStrictEqual([]);
    expect(page?.text).not.toContain("\u001B");
  });
});
