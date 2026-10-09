import { DurableObject } from "cloudflare:workers";

import {
  dailyCountAfterVisit,
  expiredLiveVisitorKeys,
  expiredVisitorKeys,
  heartbeatMs,
  keysForVisitor,
  liveCountAfterVisit,
} from "./visitor-counting";

/** Daily unique and currently active visitor counts. */
interface VisitorCounts {
  readonly daily: number;
  readonly live: number;
}

/** Persistent visitor counter hosted by the website Worker. */
export class VisitorCounter extends DurableObject {
  /**
   * Record a heartbeat for a visitor and return current counts.
   * @param visitorId - The stable visitor identifier.
   * @returns Current daily and live visitor counts.
   */
  async track(visitorId: string): Promise<VisitorCounts> {
    const now = Date.now();
    const keys = keysForVisitor(now, visitorId);
    const { storage } = this.ctx;

    const counts = await storage.transaction(async (transaction) => {
      const storedToday = await transaction.get<string>("today");
      if (storedToday !== keys.today) {
        const dailyKeys = await transaction.list({ prefix: "daily:" });
        const seenKeys = await transaction.list({ prefix: "seen:" });
        const expired = expiredVisitorKeys({
          today: keys.today,
          now,
          dailyKeys: dailyKeys.keys(),
          seenKeys: seenKeys.keys(),
          liveEntries: [],
        });
        await Promise.all(expired.map((key) => transaction.delete(key)));
        await transaction.put("today", keys.today);
      }

      const active = await transaction.list<number>({ prefix: "live:" });
      const expiredLive = expiredLiveVisitorKeys(active, now);
      const expiredLiveSet = new Set(expiredLive);
      const visitorWasActive =
        active.has(keys.live) && !expiredLiveSet.has(keys.live);
      await Promise.all(expiredLive.map((key) => transaction.delete(key)));

      const seen = await transaction.get<boolean>(keys.seen);
      const current = (await transaction.get<number>(keys.daily)) ?? 0;
      if (!seen) {
        await transaction.put(keys.seen, true);
      }
      await transaction.put(
        keys.daily,
        dailyCountAfterVisit(current, seen ?? false)
      );
      await transaction.put(keys.live, now);

      return {
        daily: (await transaction.get<number>(keys.daily)) ?? 0,
        live: liveCountAfterVisit(
          active.size,
          expiredLive.length,
          visitorWasActive
        ),
      } satisfies VisitorCounts;
    });

    await storage.setAlarm(now + heartbeatMs);
    return counts;
  }

  /** Remove expired live visitor leases and schedule the next cleanup. */
  async alarm(): Promise<void> {
    const now = Date.now();
    const { storage } = this.ctx;
    const active = await storage.list<number>({ prefix: "live:" });
    const expired = expiredLiveVisitorKeys(active, now);
    await Promise.all(expired.map((key) => storage.delete(key)));
    const remaining = await storage.list({ prefix: "live:" });
    if (remaining.size > 0) {
      await storage.setAlarm(now + heartbeatMs);
    }
  }
}
