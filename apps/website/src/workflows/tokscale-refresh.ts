import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { Effect } from "effect";

import { createAppEnv } from "@/env";
import type { RuntimeBindings } from "@/env";
import { refreshTokscale } from "@/features/ai-usage/snapshot";

const retryPolicy = {
  retries: { limit: 3, delay: "30 seconds", backoff: "exponential" },
} as const;

/** Refreshes Tokscale usage away from the website request path. */
export class TokscaleRefreshWorkflow extends WorkflowEntrypoint<
  RuntimeBindings,
  Record<string, never>
> {
  /** Executes and publishes one durable Tokscale refresh.
   * @param event - The event that started this Workflow run.
   * @param step - The durable step interface supplied by Cloudflare.
   * @returns A summary of the published Tokscale profile.
   */
  override async run(
    event: Readonly<WorkflowEvent<Record<string, never>>>,
    step: WorkflowStep
  ) {
    console.info("[ai] Tokscale refresh workflow started.", {
      workflowId: event.instanceId,
    });

    try {
      const result = await step.do(
        "refresh-and-publish-tokscale",
        retryPolicy,
        async () =>
          await Effect.runPromise(refreshTokscale(createAppEnv(this.env)))
      );

      console.info("[ai] Tokscale refresh workflow completed.", {
        workflowId: event.instanceId,
        ...result,
      });

      return result;
    } catch (error) {
      console.error("[ai] Tokscale refresh workflow failed.", {
        workflowId: event.instanceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
