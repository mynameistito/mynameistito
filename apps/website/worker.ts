// oxlint-disable max-classes-per-file -- Workflow entrypoint classes are registered from one Worker module.
import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { Effect } from "effect";
import server from "virtual:tanstack-start-server-entry";

import { createAppEnv } from "./src/env";
import type { RuntimeBindings } from "./src/env";
import { refreshContributions } from "./src/lib/contributions";
import { refreshTokscale } from "./src/lib/tokscale";

export { VisitorCounter } from "./src/lib/visitor-counter";

/** Starts the durable contributions refresh on the configured Cron Trigger.
 * @param controller - The scheduled event containing its stable fire time.
 * @param bindings - Worker bindings for the scheduled invocation.
 */
export const scheduled = async (
  controller: ScheduledController,
  bindings: RuntimeBindings
): Promise<void> => {
  if (controller.cron === "0 4 * * *") {
    const refresh = bindings.TOKSCALE_REFRESH;
    if (!refresh) {
      console.warn(
        "[ai] Scheduled Tokscale refresh skipped: Workflow binding is not configured."
      );
      return;
    }
    const scheduledDay = new Date(controller.scheduledTime)
      .toISOString()
      .slice(0, 10);
    const id = `tokscale-refresh-${scheduledDay}`;
    try {
      const instance = await refresh.create({ id, params: {} });
      console.info("[ai] Scheduled Tokscale refresh started.", {
        workflowId: instance.id,
      });
    } catch (error) {
      console.error("[ai] Unable to start scheduled Tokscale refresh.", {
        workflowId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
    return;
  }

  const refresh = bindings.CONTRIBUTIONS_REFRESH;
  if (!refresh) {
    console.warn(
      "[open-source] Scheduled contribution refresh skipped: Workflow binding is not configured."
    );
    return;
  }
  const scheduledHour = Math.floor(controller.scheduledTime / 3_600_000);
  const id = `contributions-refresh-${scheduledHour}`;
  try {
    const instance = await refresh.create({ id, params: {} });
    console.info("[open-source] Scheduled contribution refresh started.", {
      workflowId: instance.id,
    });
  } catch (error) {
    console.error(
      "[open-source] Unable to start scheduled contribution refresh.",
      {
        workflowId: id,
        error: error instanceof Error ? error.message : String(error),
      }
    );
    throw error;
  }
};

export default { ...server, scheduled };

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
        {
          retries: { limit: 3, delay: "30 seconds", backoff: "exponential" },
        },
        () => Effect.runPromise(refreshContributions(createAppEnv(this.env)))
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
        {
          retries: { limit: 3, delay: "30 seconds", backoff: "exponential" },
        },
        () => Effect.runPromise(refreshTokscale(createAppEnv(this.env)))
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
