import { WorkflowEntrypoint } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";
import { Effect } from "effect";

import { createAppEnv } from "./src/env";
import type { RuntimeBindings } from "./src/env";
import { refreshContributions } from "./src/lib/contributions";

// Vite resolves this virtual entry to TanStack Start's current dev/build server.
export { default } from "virtual:tanstack-start-server-entry";
export { VisitorCounter } from "./src/lib/visitor-counter";

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
