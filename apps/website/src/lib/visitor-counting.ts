import { Schema } from "effect";

/** Visitor counter timing and key rules shared by both Worker runtimes. */
export const liveWindowMs = 2 * 60 * 1000;
export const heartbeatMs = 60 * 1000;

/** Daily unique and currently active visitor counts returned by the Worker. */
export const VisitorCountsSchema = Schema.Struct({
  daily: Schema.Number,
  live: Schema.Number,
});

/** Parsed visitor count response. */
export type VisitorCounts = Schema.Schema.Type<typeof VisitorCountsSchema>;

/** Storage keys used for one visitor at a particular UTC day.
 * @param timestamp - The current Unix timestamp in milliseconds.
 * @param visitorId - The parsed visitor identifier.
 * @returns Daily, seen, and live storage keys.
 */
export const keysForVisitor = (timestamp: number, visitorId: string) => {
  const today = new Date(timestamp).toISOString().slice(0, 10);
  return {
    daily: `daily:${today}`,
    live: `live:${visitorId}`,
    seen: `seen:${today}:${visitorId}`,
    today,
  } as const;
};

/** Finds live visitor keys that have exceeded the active window.
 * @param liveEntries - Stored live visitor keys and last-seen timestamps.
 * @param now - The current Unix timestamp in milliseconds.
 * @returns Expired live visitor keys.
 */
export const expiredLiveVisitorKeys = (
  liveEntries: Iterable<readonly [string, number]>,
  now: number
): readonly string[] =>
  [...liveEntries]
    .filter(([, lastSeen]) => now - lastSeen > liveWindowMs)
    .map(([key]) => key);

/** Counts active visitors after expiring leases and recording this heartbeat.
 * @param activeCount - Number of stored live visitor leases before cleanup.
 * @param expiredCount - Number of expired leases deleted during cleanup.
 * @param visitorWasActive - Whether this visitor already had a valid lease.
 * @returns The active count after the current visitor is recorded.
 */
export const liveCountAfterVisit = (
  activeCount: number,
  expiredCount: number,
  visitorWasActive: boolean
): number => activeCount - expiredCount + (visitorWasActive ? 0 : 1);

/** Storage keys that have expired under the visitor counter contract.
 * @param input - Current day, timestamp, and stored visitor keys.
 * @returns Keys to delete before calculating counts.
 */
export const expiredVisitorKeys = (input: {
  readonly today: string;
  readonly now: number;
  readonly dailyKeys: Iterable<string>;
  readonly seenKeys: Iterable<string>;
  readonly liveEntries: Iterable<readonly [string, number]>;
}): readonly string[] => {
  const daily = [...input.dailyKeys].filter(
    (key) => !key.endsWith(input.today)
  );
  const seen = [...input.seenKeys].filter(
    (key) => !key.startsWith(`seen:${input.today}:`)
  );
  const live = expiredLiveVisitorKeys(input.liveEntries, input.now);
  return [...daily, ...seen, ...live];
};

/** Computes the next daily unique count without counting repeat visits.
 * @param current - The stored daily count.
 * @param alreadySeen - Whether this visitor has a seen key for today.
 * @returns The count to persist.
 */
export const dailyCountAfterVisit = (
  current: number,
  alreadySeen: boolean
): number => (alreadySeen ? current : current + 1);
