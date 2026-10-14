import { DurableObject } from "cloudflare:workers";

import {
  dailyCountAfterVisit,
  expiredLiveVisitorKeys,
  expiredVisitorKeys,
  heartbeatMs,
  keysForVisitor,
  liveCountAfterVisit,
  postViewCountAfterVisit,
  totalCountAfterVisit,
} from "./visitor-counting";
import type { VisitorCounts } from "./visitor-counting";

/** Persistent visitor counter hosted by the website Worker. */
export class VisitorCounter extends DurableObject {
  /** Read the unique view total for a post without recording a view.
   * @param postSlug - The published post's URL slug.
   * @returns The post's unique view count.
   */
  async getPostViews(postSlug: string): Promise<number> {
    return (await this.ctx.storage.get<number>(`post:${postSlug}:views`)) ?? 0;
  }

  /** Count one post view per persistent visitor and return its unique total.
   * @param postSlug - The published post's URL slug.
   * @param visitorId - The stable visitor identifier.
   * @returns The post's unique view count.
   */
  recordPostView(postSlug: string, visitorId: string): Promise<number> {
    const viewKey = `post:${postSlug}:visitor:${visitorId}`;
    const countKey = `post:${postSlug}:views`;

    return this.ctx.storage.transaction(async (transaction) => {
      const alreadyViewed = await transaction.get<boolean>(viewKey);
      const current = (await transaction.get<number>(countKey)) ?? 0;
      const next = postViewCountAfterVisit(current, alreadyViewed ?? false);
      if (!alreadyViewed) {
        await transaction.put(viewKey, true);
        await transaction.put(countKey, next);
      }
      return next;
    });
  }

  /**
   * Record a heartbeat for a visitor and return current counts.
   * @param visitorId - The stable visitor identifier.
   * @returns Current lifetime, daily, and live visitor counts.
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
      const joined = await transaction.get<boolean>(keys.joined);
      const current = (await transaction.get<number>(keys.daily)) ?? 0;
      const total = (await transaction.get<number>("total")) ?? 0;
      if (!seen) {
        await transaction.put(keys.seen, true);
      }
      if (!joined) {
        await transaction.put(keys.joined, true);
      }
      await transaction.put(
        keys.daily,
        dailyCountAfterVisit(current, seen ?? false)
      );
      await transaction.put(
        "total",
        totalCountAfterVisit(total, joined ?? false)
      );
      await transaction.put(keys.live, now);

      return {
        daily: (await transaction.get<number>(keys.daily)) ?? 0,
        live: liveCountAfterVisit(
          active.size,
          expiredLive.length,
          visitorWasActive
        ),
        total: (await transaction.get<number>("total")) ?? 0,
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
