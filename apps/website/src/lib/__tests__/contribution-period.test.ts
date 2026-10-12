import { describe, expect, it } from "vitest";

import { startOfUtcCalendarYear } from "@/lib/contribution-period";

describe("UTC calendar-year contribution range", () => {
  it("starts the GitHub contribution period on January 1 of the current UTC year", () => {
    expect(startOfUtcCalendarYear(new Date("2026-10-12T18:01:50.383Z"))).toBe(
      "2026-01-01T00:00:00.000Z"
    );
  });

  it("uses the UTC year when an instant is near a local year boundary", () => {
    expect(startOfUtcCalendarYear(new Date("2026-01-01T00:30:00+14:00"))).toBe(
      "2025-01-01T00:00:00.000Z"
    );
  });
});
