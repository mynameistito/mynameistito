import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PackagesView } from "@/features/packages/components/packages-view";
import type { NpmPackage } from "@/features/packages/packages";

const npmPackage: NpmPackage = {
  name: "useful-package",
  description: "A useful package.",
  version: "1.2.3",
  weeklyDownloads: 42,
  npmUrl: "https://www.npmjs.com/package/useful-package",
};

describe("packages page presentation", () => {
  it.each(["2026-10-21T00:14:15Z", "2026-10-21T13:14:15+13:00"])(
    "renders %s as a machine-readable UTC time alongside packages",
    (refreshedAt) => {
      const markup = renderToStaticMarkup(
        createElement(PackagesView, { packages: [npmPackage], refreshedAt })
      );

      expect(markup).toContain("Data last updated ");
      expect(markup).toMatch(
        /<time datetime="2026-10-21T00:14:15\.000Z">2026-10-21 at 00:14 UTC<\/time>/iu
      );
      expect(markup).toContain(`href="${npmPackage.npmUrl}"`);
      expect(markup).toContain(npmPackage.name);
      expect(markup).toContain("1 packages · 42 weekly downloads");
    }
  );

  it.each([null, "invalid", ""])(
    "omits the freshness label for %s while retaining package data",
    (refreshedAt) => {
      const markup = renderToStaticMarkup(
        createElement(PackagesView, { packages: [npmPackage], refreshedAt })
      );

      expect(markup).not.toContain("Data last updated");
      expect(markup).not.toContain("<time");
      expect(markup).toContain(`href="${npmPackage.npmUrl}"`);
      expect(markup).toContain(npmPackage.name);
      expect(markup).toContain("1 packages · 42 weekly downloads");
    }
  );

  it("preserves the unavailable state when no snapshot exists", () => {
    const markup = renderToStaticMarkup(
      createElement(PackagesView, { packages: [], refreshedAt: null })
    );

    expect(markup).toContain("Package information is temporarily unavailable.");
    expect(markup).toContain("0 packages · 0 weekly downloads");
    expect(markup).not.toContain("Data last updated");
    expect(markup).not.toContain("<time");
    expect(markup).not.toContain("<ul");
  });
});
