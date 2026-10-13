import type { DailyUsage } from "./client";

/** One daily contribution as shown in the year-view heatmap. */
export interface CalendarDay {
  readonly date: string;
  readonly tokens: number;
  readonly cost: number;
  readonly intensity: number;
}

/** A calendar week, padded with nulls before the first Sunday. */
export type CalendarWeek = readonly (CalendarDay | null)[];

/** Aggregated token and spend metrics for one harness/client. */
export interface HarnessUsage {
  readonly client: string;
  readonly tokens: number;
  readonly cost: number;
  readonly messages: number;
}

/** Maps Tokscale intensity into the four GitHub-like graph levels.
 * @param intensity - Tokscale's intensity rating.
 * @returns A clamped heatmap level from zero to four.
 */
export const toHeatmapLevel = (intensity: number): number =>
  Math.max(0, Math.min(4, Math.round(intensity)));

/** Builds a Sunday-first 53-week grid from the supplied daily usage.
 * @param contributions - Daily usage records from Tokscale.
 * @returns Calendar weeks with gaps represented by null cells.
 */
export const buildCalendar = (
  contributions: readonly DailyUsage[]
): readonly CalendarWeek[] => {
  if (contributions.length === 0) {
    return [];
  }
  const usageByDate = new Map(contributions.map((day) => [day.date, day]));
  const lastDate = new Date(`${contributions.at(-1)?.date}T00:00:00.000Z`);
  const end = Date.UTC(
    lastDate.getUTCFullYear(),
    lastDate.getUTCMonth(),
    lastDate.getUTCDate()
  );
  const start = end - 364 * 24 * 60 * 60 * 1000;
  const firstDay = new Date(start).getUTCDay();
  const alignedStart = start - firstDay * 24 * 60 * 60 * 1000;
  const days = Array.from({ length: 371 }, (_, index) => {
    const date = new Date(alignedStart + index * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const usage = usageByDate.get(date);
    return usage
      ? {
          date,
          tokens: usage.totals.tokens,
          cost: usage.totals.cost,
          intensity: toHeatmapLevel(usage.intensity),
        }
      : null;
  });
  return Array.from({ length: 53 }, (_, week) =>
    days.slice(week * 7, (week + 1) * 7)
  );
};

/** Ranks harnesses by aggregate tokens over the supplied daily records.
 * @param contributions - Daily usage records from Tokscale.
 * @returns Harnesses ordered from highest token use to lowest.
 */
export const summarizeHarnesses = (
  contributions: readonly DailyUsage[]
): readonly HarnessUsage[] => {
  const totals = new Map<string, HarnessUsage>();
  for (const day of contributions) {
    for (const client of day.clients) {
      const current = totals.get(client.client);
      const tokens = Object.values(client.models).reduce(
        (total, model) => total + model.tokens,
        0
      );
      totals.set(client.client, {
        client: client.client,
        tokens: (current?.tokens ?? 0) + tokens,
        cost: (current?.cost ?? 0) + client.cost,
        messages: (current?.messages ?? 0) + client.messages,
      });
    }
  }
  return [...totals.values()].toSorted(
    (left, right) => right.tokens - left.tokens
  );
};

/** Sums a harness's model usage without trusting aggregate model ordering.
 * @param contributions - Daily usage records from Tokscale.
 * @returns Model names and their cumulative token/spend totals.
 */
export const summarizeModels = (
  contributions: readonly DailyUsage[]
): readonly {
  readonly model: string;
  readonly tokens: number;
  readonly cost: number;
}[] => {
  const totals = new Map<string, { tokens: number; cost: number }>();
  for (const day of contributions) {
    for (const client of day.clients) {
      for (const [model, usage] of Object.entries(client.models)) {
        const current = totals.get(model) ?? { tokens: 0, cost: 0 };
        totals.set(model, {
          tokens: current.tokens + usage.tokens,
          cost: current.cost + usage.cost,
        });
      }
    }
  }
  return [...totals.entries()]
    .map(([model, usage]) => ({ model, ...usage }))
    .toSorted((left, right) => right.tokens - left.tokens);
};
