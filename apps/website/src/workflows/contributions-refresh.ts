import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { Effect } from "effect";

import { createAppEnv } from "@/env";
import type { RuntimeBindings } from "@/env";
import { refreshContributions } from "@/lib/contributions";

const retryPolicy = {
  retries: { limit: 3, delay: "30 seconds", backoff: "exponential" },
} as const;

/** Refreshes GitHub contributions away from the website request path. */
export class ContributionsRefreshWorkflow extends WorkflowEntrypoint<
  RuntimeBindings,
  Record<string, never>
> {
  /** Executes one durable refresh attempt and publishes its result.
   * @param event - The event that started this Workflow run.
   * @param step - The durable step interface supplied by Cloudflare.
   * @returns The published snapshot summary.
   */
  override async run(
    event: Readonly<WorkflowEvent<Record<string, never>>>,
    step: WorkflowStep
  ) {
    const stepName = "refresh-github-contributions";
    console.info("[open-source] Contribution refresh workflow started.", {
      workflowId: event.instanceId,
      stepName,
    });

    try {
      const result = await step.do(
        stepName,
        retryPolicy,
        async () =>
          await Effect.runPromise(refreshContributions(createAppEnv(this.env)))
      );

      console.info("[open-source] Contribution refresh workflow completed.", {
        workflowId: event.instanceId,
        ...result,
      });

      return result;
    } catch (error) {
      console.error("[open-source] Contribution refresh workflow failed.", {
        workflowId: event.instanceId,
        stepName,
        errorName: error instanceof Error ? error.name : "UnknownError",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
