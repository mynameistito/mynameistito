import { describe, expect, it } from "vitest";

import { oneYearBeforeUtcInstant } from "@/features/open-source/contribution-period";

describe("rolling UTC-year contribution range", () => {
  it("starts the GitHub contribution period one year before the current instant", () => {
    expect(oneYearBeforeUtcInstant(new Date("2026-10-12T18:01:50.383Z"))).toBe(
      "2025-10-12T18:01:50.383Z"
    );
  });

  it("keeps the instant in UTC across local year boundaries", () => {
    expect(oneYearBeforeUtcInstant(new Date("2026-01-01T00:30:00+14:00"))).toBe(
      "2024-12-31T10:30:00.000Z"
    );
  });

  it("clamps leap-day ranges to the last valid day of February", () => {
    expect(oneYearBeforeUtcInstant(new Date("2024-02-29T12:00:00.000Z"))).toBe(
      "2023-02-28T12:00:00.000Z"
    );
  });
});
