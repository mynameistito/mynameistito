import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AiUsageDashboard } from "@/features/ai-usage/components/dashboard";

describe("AI usage dashboard", () => {
  it("shows the monthly subscription total while usage data is unavailable", () => {
    const markup = renderToStaticMarkup(
      createElement(AiUsageDashboard, { snapshot: null })
    );

    expect(markup).toContain("$256 NZD per month total");
  });
});
