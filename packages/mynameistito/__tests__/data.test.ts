import { describe, expect, it } from "vitest";

import { links, profile } from "../src/index.js";

describe("profile data", () => {
  it("exposes the profile metadata", () => {
    expect(profile).toEqual({
      description:
        "Tito builds TypeScript CLIs, Cloudflare tools, browser extensions, and small useful internet things.",
      name: "My Name is Tito",
    });
  });

  it("exposes labeled portfolio links", () => {
    expect(links).toEqual([
      { label: "Website", url: "https://mynameistito.com" },
      { label: "GitHub", url: "https://github.com/mynameistito" },
      { label: "npm", url: "https://www.npmjs.com/~mynameistito" },
      { label: "X", url: "https://x.com/mynameistito" },
    ]);
  });
});
