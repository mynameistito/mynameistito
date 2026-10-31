import server from "virtual:tanstack-start-server-entry";

import type { RuntimeBindings } from "./src/env";
import { startPeriodicRefreshes } from "./src/workflows/scheduled-refresh";

export { VisitorCounter } from "./src/features/visitors/counter";

export { GitHubSearchRateLimiter } from "./src/integrations/github/search-rate-limiter";

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

  await startPeriodicRefreshes(controller.scheduledTime, bindings);
};

export default { ...server, scheduled };
