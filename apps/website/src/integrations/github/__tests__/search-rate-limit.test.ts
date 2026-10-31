import { describe, expect, it } from "vitest";

import { reserveSearchRequestSlot } from "@/integrations/github/search-rate-limit";

describe("GitHub Search API request reservations", () => {
  it("spaces concurrent reservations in one shared quota bucket", () => {
    const first = reserveSearchRequestSlot(1000, undefined, 6100);

    const second = reserveSearchRequestSlot(1000, first.nextAllowedAt, 6100);

    expect(first).toStrictEqual({ delayMs: 0, nextAllowedAt: 7100 });
    expect(second).toStrictEqual({ delayMs: 6100, nextAllowedAt: 13_200 });
  });

  it("starts immediately after an earlier reservation has expired", () => {
    expect(reserveSearchRequestSlot(8000, 7100, 2100)).toStrictEqual({
      delayMs: 0,
      nextAllowedAt: 10_100,
    });
  });
});
