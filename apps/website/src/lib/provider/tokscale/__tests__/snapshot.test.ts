import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { createAppEnv } from "@/env";
import type { OpenSourceKVBinding } from "@/env";
import { Tokscale } from "@/lib/provider/tokscale/client";
import type { TokscaleProfile } from "@/lib/provider/tokscale/client";
import {
  loadTokscale,
  refreshTokscale,
} from "@/lib/provider/tokscale/snapshot";

const snapshotKey = "ai:tokscale:v1";

const profile: TokscaleProfile = {
  stats: {
    totalTokens: 1250,
    totalCost: 0.42,
    inputTokens: 200,
    outputTokens: 100,
    cacheReadTokens: 900,
    cacheWriteTokens: 25,
    reasoningTokens: 25,
    submissionCount: 7,
    activeDays: 2,
    sessionCount: 3,
  },
  updatedAt: "2026-10-13T00:00:00.000Z",
  modelUsage: [
    { model: "gpt-6-luna", tokens: 1250, cost: 0.42, percentage: 100 },
  ],
  contributions: [],
};

describe("Tokscale snapshot refresh", () => {
  it("publishes a fully validated profile to the shared KV namespace", async () => {
    const values = new Map<string, string>();

    const kv: OpenSourceKVBinding = {
      get: async (key) => await Promise.resolve(values.get(key) ?? null),
      put: async (key, value) => {
        await Promise.resolve();
        values.set(key, value);
      },
    };

    const tokscaleLayer = Layer.succeed(
      Tokscale,
      Tokscale.of({ profile: () => Effect.succeed(profile) })
    );

    const result = await Effect.runPromise(
      refreshTokscale(createAppEnv({ OPEN_SOURCE_KV: kv }), tokscaleLayer)
    );

    const saved = values.get(snapshotKey);

    expect(result).toMatchObject({
      contributionDays: 0,
      totalTokens: 1250,
      stats: profile.stats,
      topModels: profile.modelUsage,
    });
    expect(saved).toBeDefined();
    expect(JSON.parse(saved ?? "{}")).toMatchObject({ data: profile });
  });

  it("fails clearly when snapshot storage is not configured", async () => {
    const result = await Effect.runPromiseExit(
      refreshTokscale(createAppEnv({}))
    );

    expect(result._tag).toBe("Failure");
  });

  it("uses a separate hourly ID for on-demand refreshes", async () => {
    const workflowIds: string[] = [];

    const kv: OpenSourceKVBinding = {
      get: async () => await Promise.resolve(null),
      put: async () => {},
    };

    const tokscaleRefresh = {
      create: async ({ id }: { readonly id: string }) => {
        await Promise.resolve();
        workflowIds.push(id);

        return { id };
      },
      get: async () =>
        await Promise.resolve({
          status: async () => await Promise.resolve({ status: "running" }),
          restart: async () => {
            await Promise.resolve();
          },
        }),
    };

    const snapshot = await Effect.runPromise(
      loadTokscale(
        createAppEnv({
          OPEN_SOURCE_KV: kv,
          TOKSCALE_REFRESH: tokscaleRefresh,
        })
      )
    );

    expect(snapshot).toBeNull();
    expect(workflowIds).toHaveLength(1);
    expect(workflowIds[0]).toMatch(
      /^tokscale-refresh-on-demand-\d{4}-\d{2}-\d{2}-\d{2}$/u
    );
  });

  it("restarts an errored on-demand workflow when its ID already exists", async () => {
    const restartedIds: string[] = [];

    const kv: OpenSourceKVBinding = {
      get: async () => await Promise.resolve(null),
      put: async () => {},
    };

    const tokscaleRefresh = {
      create: async ({ id }: { readonly id: string }) => {
        await Promise.resolve();
        throw new Error(`Workflow ${id} already exists`);
      },
      get: async (id: string) =>
        await Promise.resolve({
          status: async () => await Promise.resolve({ status: "errored" }),
          restart: async () => {
            restartedIds.push(id);

            await Promise.resolve();
          },
        }),
    };

    const snapshot = await Effect.runPromise(
      loadTokscale(
        createAppEnv({
          OPEN_SOURCE_KV: kv,
          TOKSCALE_REFRESH: tokscaleRefresh,
        })
      )
    );

    expect(snapshot).toBeNull();
    expect(restartedIds).toHaveLength(1);
    expect(restartedIds[0]).toMatch(
      /^tokscale-refresh-on-demand-\d{4}-\d{2}-\d{2}-\d{2}$/u
    );
  });
});
