import type { RuntimeBindings } from "@/env";

/** Starts independent periodic refreshes even when a sibling binding fails.
 * @param scheduledTime - The scheduled invocation's stable timestamp.
 * @param bindings - Available refresh workflow bindings.
 */
export const startPeriodicRefreshes = async (
  scheduledTime: number,
  bindings: Pick<RuntimeBindings, "CONTRIBUTIONS_REFRESH" | "PACKAGES_REFRESH">
): Promise<void> => {
  const scheduledHour = Math.floor(scheduledTime / 3_600_000);

  const start = async (
    binding: RuntimeBindings["CONTRIBUTIONS_REFRESH"],
    name: string
  ): Promise<void> => {
    if (!binding) {
      console.warn(
        `[${name}] Scheduled refresh skipped: binding is not configured.`
      );

      return;
    }

    const id = `${name}-refresh-${scheduledHour}`;

    try {
      const instance = await binding.create({ id, params: {} });
      console.info(`[${name}] Scheduled refresh started.`, {
        workflowId: instance.id,
      });
    } catch (error) {
      console.error(`[${name}] Unable to start scheduled refresh.`, {
        workflowId: id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  const results = await Promise.allSettled([
    start(bindings.CONTRIBUTIONS_REFRESH, "contributions"),
    start(bindings.PACKAGES_REFRESH, "packages"),
  ]);

  if (results.some((result) => result.status === "rejected")) {
    throw new Error("One or more scheduled refresh workflows failed to start.");
  }
};
