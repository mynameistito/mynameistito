import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import type { RuntimeBindings } from "@/env";
import { ContributionsRefreshWorkflow } from "@/workflows/contributions-refresh";

describe("contributions refresh workflow", () => {
  it("runs the refresh in a durable step and reports a missing KV binding", async () => {
    // SAFETY: The test runtime shim ignores the execution context; the workflow only reads env.
    const workflow = new ContributionsRefreshWorkflow(
      {} as ExecutionContext,
      {} satisfies RuntimeBindings
    );
    const event = {
      instanceId: "contributions-refresh-test",
      payload: {},
      timestamp: new Date(0),
      workflowName: "ContributionsRefreshWorkflow",
    } satisfies WorkflowEvent<Record<string, never>>;

    // SAFETY: This workflow only calls step.do; the test stub invokes its callback immediately.
    const step = {
      do: async (
        _name: string,
        _config: unknown,
        callback: () => Promise<unknown>
      ) => await callback(),
    } as WorkflowStep;

    await expect(workflow.run(event, step)).rejects.toThrow(
      "The open-source KV binding is not configured."
    );
  });
});
