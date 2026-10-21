import { DurableObject } from "cloudflare:workers";

import {
  dailyCountAfterVisit,
  expiredLiveVisitorKeys,
  expiredVisitorKeys,
  heartbeatMs,
  keysForVisitor,
  liveCountAfterVisit,
  liveWindowMs,
  postViewCountAfterVisit,
  totalCountAfterVisit,
} from "./counting";
import type { VisitorCounts } from "./counting";

const liveCountKey = "liveCount";
const liveCountInitializedKey = "liveCountInitialized";

interface VisitorCounterTransaction {
  readonly delete: (key: string) => Promise<boolean>;
  readonly get: <Value>(key: string) => Promise<Value | undefined>;
  readonly getAlarm: () => Promise<number | null>;
  readonly list: <Value>(options?: {
    readonly prefix?: string;
  }) => Promise<Map<string, Value>>;
  readonly put: (key: string, value: boolean | number) => Promise<void>;
  readonly setAlarm: (time: number) => Promise<void>;
}

/** Initializes the aggregate once while preserving leases created by older code.
 * @param transaction - The active Durable Object transaction.
 * @param now - Current Unix timestamp in milliseconds.
 * @returns The aggregate and migrated leases when this call performed migration.
 */
const initializeLiveCount = async (
  transaction: VisitorCounterTransaction,
  now: number
): Promise<{
  readonly count: number;
  readonly liveEntries?: Map<string, number>;
}> => {
  if ((await transaction.get<boolean>(liveCountInitializedKey)) === true) {
    return { count: (await transaction.get<number>(liveCountKey)) ?? 0 };
  }

  const liveEntries = await transaction.list<number>({ prefix: "live:" });
  const expired = new Set(expiredLiveVisitorKeys(liveEntries, now));

  await Promise.all(
    [...expired].map(async (key) => await transaction.delete(key))
  );

  const count = liveEntries.size - expired.size;
  await transaction.put(liveCountKey, count);
  await transaction.put(liveCountInitializedKey, true);

  return {
    count,
    liveEntries: new Map([...liveEntries].filter(([key]) => !expired.has(key))),
  };
};

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
  async recordPostView(postSlug: string, visitorId: string): Promise<number> {
    const viewKey = `post:${postSlug}:visitor:${visitorId}`;
    const countKey = `post:${postSlug}:views`;

    return await this.ctx.storage.transaction(async (transaction) => {
      const alreadyViewed = await transaction.get<boolean>(viewKey);
      const current = (await transaction.get<number>(countKey)) ?? 0;
      const next = postViewCountAfterVisit(current, alreadyViewed ?? false);

      if (alreadyViewed !== true) {
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

    return await storage.transaction(async (transaction) => {
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

        await Promise.all(
          expired.map(async (key) => await transaction.delete(key))
        );

        await transaction.put("today", keys.today);
      }

      const aggregate = await initializeLiveCount(transaction, now);
      const lastSeen = await transaction.get<number>(keys.live);
      const hasLease = lastSeen !== undefined;
      const visitorWasActive = hasLease && now - lastSeen <= liveWindowMs;
      const expiredOwnLease = hasLease && !visitorWasActive;

      const [seen, joined, dailyCount, totalCount] = await Promise.all([
        transaction.get<boolean>(keys.seen),
        transaction.get<boolean>(keys.joined),
        transaction.get<number>(keys.daily),
        transaction.get<number>("total"),
      ]);

      const current = dailyCount ?? 0;
      const total = totalCount ?? 0;

      if (seen !== true) {
        await transaction.put(keys.seen, true);
      }

      if (joined !== true) {
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

      const liveCount = liveCountAfterVisit(
        aggregate.count,
        expiredOwnLease ? 1 : 0,
        visitorWasActive
      );

      await transaction.put(liveCountKey, liveCount);

      const currentAlarm = await transaction.getAlarm();
      const nextAlarm = now + heartbeatMs;

      if (currentAlarm === null || currentAlarm > nextAlarm) {
        await transaction.setAlarm(nextAlarm);
      }

      return {
        daily: (await transaction.get<number>(keys.daily)) ?? 0,
        live: liveCount,
        total: (await transaction.get<number>("total")) ?? 0,
      } satisfies VisitorCounts;
    });
  }

  /** Remove expired live visitor leases and schedule the next cleanup. */
  async alarm(): Promise<void> {
    const now = Date.now();
    const { storage } = this.ctx;

    const remaining = await storage.transaction(async (transaction) => {
      const aggregate = await initializeLiveCount(transaction, now);

      const active =
        aggregate.liveEntries ??
        (await transaction.list<number>({ prefix: "live:" }));

      const expired = expiredLiveVisitorKeys(active, now);

      await Promise.all(
        expired.map(async (key) => await transaction.delete(key))
      );

      const remainingCount = active.size - expired.length;

      await transaction.put(liveCountKey, remainingCount);

      return remainingCount;
    });

    if (remaining > 0) {
      await storage.setAlarm(now + heartbeatMs);
    }
  }
}
