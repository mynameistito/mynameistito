import server from "virtual:tanstack-start-server-entry";

import type { RuntimeBindings } from "./src/env";

export { VisitorCounter } from "./src/lib/visitor-counter";

export { ContributionsRefreshWorkflow } from "./src/workflows/contributions-refresh";

export { PackagesRefreshWorkflow } from "./src/workflows/packages-refresh";

export { TokscaleRefreshWorkflow } from "./src/workflows/tokscale-refresh";

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

  const packagesRefresh = bindings.PACKAGES_REFRESH;

  if (!packagesRefresh) {
    console.warn(
      "[packages] Scheduled package refresh skipped: Workflow binding is not configured."
    );

    return;
  }

  const packagesWorkflowId = `packages-refresh-${scheduledHour}`;

  try {
    const instance = await packagesRefresh.create({
      id: packagesWorkflowId,
      params: {},
    });

    console.info("[packages] Scheduled package refresh started.", {
      workflowId: instance.id,
    });
  } catch (error) {
    console.error("[packages] Unable to start scheduled package refresh.", {
      workflowId: packagesWorkflowId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export default { ...server, scheduled };
