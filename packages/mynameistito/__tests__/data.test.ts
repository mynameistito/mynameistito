import { describe, expect, it, vi } from "vitest";

import { links, profile } from "../src/index.js";

describe("profile data", () => {
  it("exposes the profile metadata", () => {
    expect(profile).toStrictEqual({
      description:
        "Tito builds TypeScript CLIs, Cloudflare tools, browser extensions, and small useful internet things.",
      name: "My Name is Tito",
    });
  });

  it("exposes labeled portfolio links", () => {
    expect(links).toStrictEqual([
      { label: "Website", url: "https://mynameistito.com" },
      { label: "GitHub", url: "https://github.com/mynameistito" },
      { label: "npm", url: "https://www.npmjs.com/~mynameistito" },
      { label: "X", url: "https://x.com/mynameistito" },
    ]);
  });

  it("prints the profile card through the Effect runtime", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(vi.fn());
    try {
      await import("../src/cli.js");
      expect(log).toHaveBeenCalledWith(
        [
          `# ${profile.name}`,
          "",
          profile.description,
          "",
          ...links.map((link) => link.url),
        ].join("\n")
      );
    } finally {
      log.mockRestore();
    }
  });
});
