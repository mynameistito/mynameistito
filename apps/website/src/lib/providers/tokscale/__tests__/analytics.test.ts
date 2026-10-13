import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  buildCalendar,
  summarizeHarnesses,
  summarizeModels,
  toHeatmapLevel,
} from "@/lib/providers/tokscale/analytics";
import { decodeTokscaleResponse } from "@/lib/providers/tokscale/client";
import type { DailyUsage } from "@/lib/providers/tokscale/client";

const createDay = (
  date: string,
  client: string,
  model: string,
  tokens: number,
  cost: number,
  intensity = 1
): DailyUsage => ({
  date,
  totals: { tokens, cost, messages: 0 },
  intensity,
  tokenBreakdown: {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    reasoning: 0,
  },
  clients: [
    {
      client,
      modelId: "",
      models: {
        [model]: {
          cost,
          input: 0,
          output: 0,
          tokens,
          messages: 1,
          cacheRead: 0,
          reasoning: 0,
          cacheWrite: 0,
        },
      },
      tokens: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        reasoning: 0,
      },
      cost,
      messages: 1,
    },
  ],
});

describe("Tokscale analytics", () => {
  it("builds a year calendar with Sunday-first weeks and empty-day gaps", () => {
    const calendar = buildCalendar([
      createDay("2026-10-11", "codex", "gpt-6-luna", 40, 0.2, 8),
      createDay("2026-10-13", "opencode", "gpt-6-luna", 20, 0.1, 2),
    ]);
    const cells = calendar.flat();
    const finalDay = cells.find((day) => day?.date === "2026-10-13");
    const indexBeforeGap = cells.findIndex((day) => day?.date === "2026-10-11");

    expect(calendar).toHaveLength(53);
    expect(calendar.every((week) => week.length === 7)).toBeTruthy();
    expect(finalDay).toMatchObject({ tokens: 20, intensity: 2 });
    expect(cells[indexBeforeGap + 1]).toBeNull();
  });

  it("clamps Tokscale intensity to the five contribution levels", () => {
    expect(toHeatmapLevel(-2)).toBe(0);
    expect(toHeatmapLevel(2.2)).toBe(2);
    expect(toHeatmapLevel(9)).toBe(4);
  });

  it("ranks harnesses and models by their aggregated token counts", () => {
    const contributions = [
      createDay("2026-10-12", "codex", "gpt-6-luna", 40, 0.2),
      createDay("2026-10-13", "opencode", "gpt-5.6-luna", 80, 0.3),
      createDay("2026-10-13", "codex", "gpt-6-luna", 20, 0.1),
    ];

    const harnesses = summarizeHarnesses(contributions);
    expect(
      harnesses.map(({ client, tokens, messages }) => ({
        client,
        tokens,
        messages,
      }))
    ).toStrictEqual([
      { client: "opencode", tokens: 80, messages: 1 },
      { client: "codex", tokens: 60, messages: 2 },
    ]);
    expect(harnesses[1]?.cost).toBeCloseTo(0.3);
    const models = summarizeModels(contributions);
    expect(
      models.map(({ model, tokens }) => ({ model, tokens }))
    ).toStrictEqual([
      { model: "gpt-5.6-luna", tokens: 80 },
      { model: "gpt-6-luna", tokens: 60 },
    ]);
    expect(models[1]?.cost).toBeCloseTo(0.3);
  });

  it("decodes and validates Tokscale data at the provider boundary", async () => {
    const decoded = await Effect.runPromise(
      decodeTokscaleResponse({
        stats: {
          totalTokens: 40,
          totalCost: 0.2,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          reasoningTokens: 0,
          submissionCount: 1,
          activeDays: 1,
          sessionCount: 1,
        },
        updatedAt: "2026-10-13T00:00:00.000Z",
        modelUsage: [
          { model: "gpt-6-luna", tokens: 40, cost: 0.2, percentage: 100 },
        ],
        contributions: [
          createDay("2026-10-13", "codex", "gpt-6-luna", 40, 0.2),
        ],
      })
    );

    expect(decoded.stats.totalTokens).toBe(40);
    expect(decoded.contributions[0]?.clients[0]?.client).toBe("codex");
    await expect(
      Effect.runPromise(
        decodeTokscaleResponse({ stats: {}, contributions: [] })
      )
    ).rejects.toMatchObject({ _tag: "TokscaleRequestError" });
  });
});
