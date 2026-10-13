import {
  ArrowUpRight,
  ChartColumnIncreasing,
  Cpu,
  Sparkles,
} from "lucide-react";
import type { CSSProperties } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { profile } from "@/lib/profile";
import {
  buildCalendar,
  summarizeHarnesses,
  summarizeModels,
} from "@/lib/providers/tokscale/analytics";
import type {
  CalendarDay,
  CalendarWeek,
} from "@/lib/providers/tokscale/analytics";
import type { TokscaleSnapshot } from "@/lib/tokscale";

const numberFormat = new Intl.NumberFormat("en-US");
const currencyFormat = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  style: "currency",
});

const compactTokens = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));

const monthLabels = (weeks: readonly CalendarWeek[]) => {
  const labels: { label: string; week: number }[] = [];
  for (const [weekIndex, week] of weeks.entries()) {
    const firstDayOfMonth = week.find((day) => day?.date.endsWith("-01"));
    if (firstDayOfMonth) {
      labels.push({
        label: new Intl.DateTimeFormat("en", {
          month: "short",
          timeZone: "UTC",
        }).format(new Date(`${firstDayOfMonth.date}T00:00:00.000Z`)),
        week: weekIndex,
      });
    }
  }
  return labels;
};

const ActivityCalendar = ({
  contributions,
}: {
  readonly contributions: NonNullable<TokscaleSnapshot>["data"]["contributions"];
}) => {
  const weeks = buildCalendar(contributions);
  const labels = monthLabels(weeks);
  const calendarDays = weeks
    .flat()
    .filter((day): day is CalendarDay => day !== null);
  const count = calendarDays.reduce((total, day) => total + day.tokens, 0);
  const activeDays = calendarDays.filter((day) => day.tokens > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily token usage</CardTitle>
        <CardDescription>
          {compactTokens(count)} tokens across {numberFormat.format(activeDays)}{" "}
          active days in the last year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <div className="overflow-x-auto pb-1">
            <div aria-hidden="true" className="tokscale-month-labels">
              {labels.map((month) => (
                <span
                  key={`${month.label}-${month.week}`}
                  // SAFETY: The month position is an integer in the 53-week grid.
                  style={{ "--month-column": month.week + 1 } as CSSProperties}
                >
                  {month.label}
                </span>
              ))}
            </div>
            <figure
              aria-label="Daily Tokscale token usage over the last year"
              className="tokscale-heatmap mt-1"
            >
              {weeks.map((week, weekIndex) => (
                <span className="tokscale-heatmap-week" key={weekIndex}>
                  {week.map((day, dayIndex) => (
                    <span
                      aria-hidden={!day}
                      aria-label={
                        day
                          ? `${formatDate(day.date)}: ${numberFormat.format(day.tokens)} tokens`
                          : undefined
                      }
                      className="tokscale-heatmap-day"
                      data-level={day?.intensity ?? 0}
                      key={`${weekIndex}-${dayIndex}`}
                      role={day ? "img" : undefined}
                    />
                  ))}
                </span>
              ))}
            </figure>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-xs text-muted">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                aria-hidden="true"
                className="tokscale-heatmap-day size-3"
                data-level={level}
                key={level}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const UsageRanking = ({
  title,
  description,
  rows,
  icon,
}: {
  readonly title: string;
  readonly description: string;
  readonly rows: readonly {
    readonly label: string;
    readonly tokens: number;
    readonly cost: number;
  }[];
  readonly icon: "harness" | "model";
}) => {
  const maxTokens = Math.max(...rows.map((row) => row.tokens), 1);
  const Icon = icon === "harness" ? Cpu : Sparkles;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2">
            <Icon
              aria-hidden="true"
              className="text-muted"
              data-icon="inline-start"
            />
            {title}
          </span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <ol className="m-0 grid list-none gap-4 p-0">
            {rows.map((row) => (
              <li className="grid gap-2" key={row.label}>
                <div className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-text">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted tabular-nums">
                    {compactTokens(row.tokens)} ·{" "}
                    {currencyFormat.format(row.cost)}
                  </span>
                </div>
                <div aria-hidden="true" className="ai-usage-bar">
                  <span
                    // SAFETY: Usage ratio is clamped to a positive percentage.
                    style={
                      {
                        "--usage-width": `${Math.max((row.tokens / maxTokens) * 100, 1)}%`,
                      } as CSSProperties
                    }
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="m-0 text-sm text-muted">
            No breakdown is available yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/** Renders a responsive usage overview sourced from the published snapshot.
 * @returns The analytics dashboard or its not-yet-published empty state.
 */
export const AiUsageDashboard = ({
  snapshot,
}: {
  readonly snapshot: TokscaleSnapshot | null;
}) => {
  if (!snapshot) {
    return (
      <main className="page-shell pt-page-top-header pb-page-bottom">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ChartColumnIncreasing aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Usage data is updating</EmptyTitle>
            <EmptyDescription>
              The next Tokscale snapshot has been queued. Please check back
              shortly.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  const { data } = snapshot;
  const harnesses = summarizeHarnesses(data.contributions);
  const models = summarizeModels(data.contributions);
  const latestDay = data.contributions.at(-1);
  const latestUpdate = new Date(snapshot.refreshedAt);
  return (
    <main className="page-shell pt-page-top-header pb-page-bottom">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <p className="m-0 flex items-center gap-2 text-sm text-muted">
            <ChartColumnIncreasing aria-hidden="true" size={16} />
            AI usage · @mynameistito
            <Badge variant="outline">Tokscale</Badge>
          </p>
          <h1 className="m-0 text-page-title font-semibold tracking-title text-text">
            Tokens at work
          </h1>
          <p className="m-0 max-w-prose text-sm leading-copy text-muted">
            A year-view of the models and coding harnesses behind my daily work.
          </p>
        </div>
        <a
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
          href={`https://tokscale.ai/u/${encodeURIComponent(profile.tokscale)}`}
          rel="noreferrer"
          target="_blank"
        >
          Tokscale profile <ArrowUpRight aria-hidden="true" size={14} />
        </a>
      </header>

      <section
        aria-label="Lifetime usage summary"
        className="mb-6 grid gap-3 sm:grid-cols-3"
      >
        <Card>
          <CardHeader>
            <CardDescription>Tokens tracked</CardDescription>
            <CardTitle>
              <span className="text-2xl text-text tabular-nums">
                {compactTokens(data.stats.totalTokens)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="m-0 text-xs text-muted">
              {numberFormat.format(data.stats.activeDays)} active days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Estimated spend</CardDescription>
            <CardTitle>
              <span className="text-2xl text-text tabular-nums">
                {currencyFormat.format(data.stats.totalCost)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="m-0 text-xs text-muted">
              Across {numberFormat.format(data.stats.sessionCount)} sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Top model</CardDescription>
            <CardTitle>
              <span className="truncate text-xl text-text">
                {models[0]?.model ?? "No model data"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="m-0 text-xs text-muted">
              {models[0]
                ? `${compactTokens(models[0].tokens)} tokens tracked`
                : "Model totals are not available"}
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6">
        <ActivityCalendar contributions={data.contributions} />
        <section
          aria-label="Most-used harnesses and models"
          className="grid gap-6 md:grid-cols-2"
        >
          <UsageRanking
            description="Token totals and estimated spend by tool."
            icon="harness"
            rows={harnesses.slice(0, 5).map((item) => ({
              label: item.client,
              tokens: item.tokens,
              cost: item.cost,
            }))}
            title="Favorite harnesses"
          />
          <UsageRanking
            description="Models ranked by total tokens recorded."
            icon="model"
            rows={models.slice(0, 5).map((item) => ({
              label: item.model,
              tokens: item.tokens,
              cost: item.cost,
            }))}
            title="Favorite models"
          />
        </section>
      </div>
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          {latestDay
            ? `Most recent usage: ${formatDate(latestDay.date)}`
            : "No daily usage recorded"}
        </span>
        <span>
          Snapshot refreshed{" "}
          {new Intl.DateTimeFormat("en-NZ", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }).format(latestUpdate)}
        </span>
      </footer>
    </main>
  );
};
