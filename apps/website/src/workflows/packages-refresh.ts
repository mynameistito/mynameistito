import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { Effect } from "effect";

import { createAppEnv } from "@/env";
import type { RuntimeBindings } from "@/env";
import { refreshPackages } from "@/lib/packages";

const retryPolicy = {
  retries: { limit: 3, delay: "30 seconds", backoff: "exponential" },
} as const;

/** Refreshes npm package metadata away from the website request path. */
export class PackagesRefreshWorkflow extends WorkflowEntrypoint<
  RuntimeBindings,
  Record<string, never>
> {
  /** Executes and publishes one durable npm package refresh.
   * @param event - The event that started this Workflow run.
   * @param step - The durable step interface supplied by Cloudflare.
   * @returns A summary of the published package data.
   */
  override async run(
    event: Readonly<WorkflowEvent<Record<string, never>>>,
    step: WorkflowStep
  ) {
    const stepName = "refresh-and-publish-npm-packages";
    console.info("[packages] Package refresh workflow started.", {
      workflowId: event.instanceId,
      stepName,
    });

    try {
      const result = await step.do(
        stepName,
        retryPolicy,
        async () =>
          await Effect.runPromise(refreshPackages(createAppEnv(this.env)))
      );

      console.info("[packages] Package refresh workflow completed.", {
        workflowId: event.instanceId,
        ...result,
      });

      return result;
    } catch (error) {
      console.error("[packages] Package refresh workflow failed.", {
        workflowId: event.instanceId,
        stepName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
