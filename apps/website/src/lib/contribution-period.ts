/** Returns the UTC instant one calendar year before the supplied instant.
 * @param instant - The end instant of the rolling-year window.
 * @returns The UTC instant one calendar year earlier as an ISO timestamp.
 */
export const oneYearBeforeUtcInstant = (instant: Date): string => {
  const yearBefore = new Date(instant);
  const dayOfMonth = yearBefore.getUTCDate();
  yearBefore.setUTCFullYear(yearBefore.getUTCFullYear() - 1);
  if (yearBefore.getUTCDate() !== dayOfMonth) {
    yearBefore.setUTCDate(0);
  }
  return yearBefore.toISOString();
};
