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
    expect(markup).toContain(
      '$140.51 USD per month total · Last updated <time dateTime="'
    );
    expect(markup).toContain("Google AI");
    expect(markup).toMatch(
      /PRO100 · \$87\.82 USD\/month.*PRO · \$19\.76 USD\/month.*Premium · \$32\.93 USD\/month/u
    );
  });
});
