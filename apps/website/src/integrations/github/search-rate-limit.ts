/** Returns the delay and next reservation time for a shared Search API bucket.
 * @param now - The current time in milliseconds.
 * @param nextAllowedAt - The previous reservation time, if any.
 * @param intervalMs - The minimum interval between requests.
 * @returns The wait before this request and the next available time.
 */
export const reserveSearchRequestSlot = (
  now: number,
  nextAllowedAt: number | undefined,
  intervalMs: number
) => {
  const startsAt = Math.max(now, nextAllowedAt ?? now);

  return {
    delayMs: startsAt - now,
    nextAllowedAt: startsAt + intervalMs,
  };
};
