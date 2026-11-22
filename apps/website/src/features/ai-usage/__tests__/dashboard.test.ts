import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AiUsageDashboard } from "@/features/ai-usage/components/dashboard";

describe("AI usage dashboard", () => {
  it("shows converted subscription prices above the usage empty state", () => {
    const markup = renderToStaticMarkup(
      createElement(AiUsageDashboard, { snapshot: null })
    );

    expect(markup).toMatch(/Current subscriptions.*Usage data is updating/u);
    expect(markup).toContain("Approx. $140.51 USD per month total");
    expect(markup).toContain("PRO100 · $87.82 USD/month");
    expect(markup).toContain("PRO · $19.76 USD/month");
    expect(markup).toContain("Premium · $32.93 USD/month");
  });
});
