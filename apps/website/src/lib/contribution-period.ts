/** Returns the start of the UTC calendar year containing an instant.
 * @param instant - The instant to find the calendar year for.
 * @returns The UTC start of that calendar year as an ISO timestamp.
 */
export const startOfUtcCalendarYear = (instant: Date): string =>
  new Date(Date.UTC(instant.getUTCFullYear(), 0, 1)).toISOString();
