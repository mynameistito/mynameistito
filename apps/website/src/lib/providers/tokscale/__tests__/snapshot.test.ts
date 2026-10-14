import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { createAppEnv } from "@/env";
import type { OpenSourceKVBinding } from "@/env";
import { Tokscale } from "@/lib/providers/tokscale/client";
import type { TokscaleProfile } from "@/lib/providers/tokscale/client";
import { loadTokscale, refreshTokscale } from "@/lib/tokscale";

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
      get: (key) => Promise.resolve(values.get(key) ?? null),
      put: (key, value) => {
        values.set(key, value);

        return Promise.resolve();
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

    expect(result.contributionDays).toBe(0);
    expect(result.totalTokens).toBe(1250);
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
      get: () => Promise.resolve(null),
      put: () => Promise.resolve(),
    };

    const tokscaleRefresh = {
      create: ({ id }: { readonly id: string }) => {
        workflowIds.push(id);

        return Promise.resolve({ id });
      },
      get: () =>
        Promise.resolve({
          status: () => Promise.resolve({ status: "running" }),
          restart: () => Promise.resolve(),
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
      get: () => Promise.resolve(null),
      put: () => Promise.resolve(),
    };

    const tokscaleRefresh = {
      create: ({ id }: { readonly id: string }) =>
        Promise.reject(new Error(`Workflow ${id} already exists`)),
      get: (id: string) =>
        Promise.resolve({
          status: () => Promise.resolve({ status: "errored" }),
          restart: () => {
            restartedIds.push(id);

            return Promise.resolve();
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
