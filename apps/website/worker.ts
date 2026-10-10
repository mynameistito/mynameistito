import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { Effect } from "effect";
import server from "virtual:tanstack-start-server-entry";

import { createAppEnv } from "./src/env";
import type { RuntimeBindings } from "./src/env";
import { refreshContributions } from "./src/lib/contributions";

export { VisitorCounter } from "./src/lib/visitor-counter";

/** Starts the durable contributions refresh on the configured Cron Trigger.
 * @param controller - The scheduled event containing its stable fire time.
 * @param bindings - Worker bindings for the scheduled invocation.
 */
export const scheduled = async (
  controller: ScheduledController,
  bindings: RuntimeBindings
): Promise<void> => {
  const refresh = bindings.CONTRIBUTIONS_REFRESH;
  if (!refresh) {
    return;
  }
  const scheduledHour = Math.floor(controller.scheduledTime / 3_600_000);
  await refresh.create({
    id: `contributions-refresh-${scheduledHour}`,
    params: {},
  });
};

export default { ...server, scheduled };

/** Refreshes GitHub contributions away from the website request path. */
export class ContributionsRefreshWorkflow extends WorkflowEntrypoint<
  RuntimeBindings,
  Record<string, never>
> {
  /** Executes one durable refresh attempt and publishes its result.
   * @param _event - The event that started this Workflow run.
   * @param step - The durable step interface supplied by Cloudflare.
   * @returns The published snapshot summary.
   */
  override run(
    _event: Readonly<WorkflowEvent<Record<string, never>>>,
    step: WorkflowStep
  ) {
    return step.do(
      "refresh-and-publish-contributions",
      {
        retries: { limit: 3, delay: "30 seconds", backoff: "exponential" },
      },
      () => Effect.runPromise(refreshContributions(createAppEnv(this.env)))
    );
  }
}
