import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OpenSourceKVBinding, RuntimeBindings } from "@/env";
import { PackagesRefreshWorkflow } from "@/workflows/packages-refresh";

describe(PackagesRefreshWorkflow, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("composes the registry Layer and publishes a package snapshot", async () => {
    const stored = new Map<string, string>();

    const kv: OpenSourceKVBinding = {
      get: async (key) => await Promise.resolve(stored.get(key) ?? null),
      put: async (key, value) => {
        await Promise.resolve();
        stored.set(key, value);
      },
    };

    const runtimeBindings: RuntimeBindings = { OPEN_SOURCE_KV: kv };

    const fetch = vi.fn<typeof globalThis.fetch>(
      Object.assign(
        async (_input: Parameters<typeof globalThis.fetch>[0]) =>
          await Promise.resolve(
            Response.json({
              objects: [
                {
                  downloads: { weekly: 7 },
                  package: { name: "test-package", version: "1.2.3" },
                },
              ],
            })
          ),
        { preconnect: () => {} }
      )
    );

    vi.stubGlobal("fetch", fetch);

    // SAFETY: The workflow under test never reads the execution context.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const executionContext = {} as ExecutionContext;

    const workflow = new PackagesRefreshWorkflow(
      executionContext,
      runtimeBindings
    );

    let invokedStep = "";

    const step = {
      do: async (
        name: string,
        _options: RefreshStepOptions,
        operation: () => Promise<PackageRefreshSummary>
      ): Promise<PackageRefreshSummary> => {
        invokedStep = name;

        return await operation();
      },
    };

    // SAFETY: run() calls only `do(name, config, callback)`; the fake implements that overload.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const workflowStep = step as WorkflowStep;

    const event: WorkflowEvent<Record<string, never>> = {
      payload: {},
      timestamp: new Date("2026-01-01T00:00:00.000Z"),
      instanceId: "packages-refresh-test",
      workflowName: "PackagesRefreshWorkflow",
    };

    const result = await workflow.run(event, workflowStep);

    expect(invokedStep).toBe("refresh-and-publish-npm-packages");
    expect(result).toMatchObject({
      packageCount: 1,
      packages: [
        { name: "test-package", version: "1.2.3", weeklyDownloads: 7 },
      ],
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(stored.get("npm:packages:v1")).toContain("test-package");
  });
});

interface PackageRefreshSummary {
  readonly packageCount: number;
  readonly packages: readonly {
    readonly name: string;
    readonly version: string;
    readonly weeklyDownloads: number;
  }[];
  readonly refreshedAt: string;
}

interface RefreshStepOptions {
  readonly retries: {
    readonly limit: 3;
    readonly delay: "30 seconds";
    readonly backoff: "exponential";
  };
}
