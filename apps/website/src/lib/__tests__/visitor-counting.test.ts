import { describe, expect, it } from "vitest";

import {
  dailyCountAfterVisit,
  expiredLiveVisitorKeys,
  expiredVisitorKeys,
  heartbeatMs,
  keysForVisitor,
  liveCountAfterVisit,
  liveWindowMs,
} from "@/lib/visitor-counting";

describe("visitor counting rules", () => {
  it("uses UTC daily identity keys", () => {
    expect(
      keysForVisitor(Date.parse("2026-10-09T23:59:59.000Z"), "id")
    ).toStrictEqual({
      daily: "daily:2026-10-09",
      live: "live:id",
      seen: "seen:2026-10-09:id",
      today: "2026-10-09",
    });
    expect(heartbeatMs).toBe(60_000);
  });

  it("counts one daily visit and leaves a repeat unchanged", () => {
    expect(dailyCountAfterVisit(4, false)).toBe(5);
    expect(dailyCountAfterVisit(4, true)).toBe(4);
  });

  it("expires only prior-day data and visitors past the live window", () => {
    const now = 10_000;
    expect(
      expiredVisitorKeys({
        today: "2026-10-09",
        now,
        dailyKeys: ["daily:2026-10-08", "daily:2026-10-09"],
        seenKeys: ["seen:2026-10-08:old", "seen:2026-10-09:current"],
        liveEntries: [
          ["live:expired", now - liveWindowMs - 1],
          ["live:active", now - liveWindowMs],
        ],
      })
    ).toStrictEqual([
      "daily:2026-10-08",
      "seen:2026-10-08:old",
      "live:expired",
    ]);
  });

  it("uses the same live expiry decision for alarms", () => {
    expect(
      expiredLiveVisitorKeys(
        [
          ["live:expired", 1],
          ["live:active", 1 + liveWindowMs],
        ],
        1 + liveWindowMs + 1
      )
    ).toStrictEqual(["live:expired"]);
  });

  it("keeps the exact live count when renewing or adding a visitor", () => {
    expect(liveCountAfterVisit(3, 1, true)).toBe(2);
    expect(liveCountAfterVisit(3, 1, false)).toBe(3);
    expect(liveCountAfterVisit(3, 0, true)).toBe(3);
  });
});
