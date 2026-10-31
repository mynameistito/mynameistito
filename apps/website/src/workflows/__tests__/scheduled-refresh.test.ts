import { describe, expect, it } from "vitest";

import { startPeriodicRefreshes } from "@/workflows/scheduled-refresh";

describe("independent scheduled refreshes", () => {
  it("starts packages when contributions is not configured", async () => {
    const started: string[] = [];

    await startPeriodicRefreshes(7_200_000, {
      PACKAGES_REFRESH: {
        create: async ({ id }) => {
          started.push(id);

          return await Promise.resolve({ id });
        },
      },
    });

    expect(started).toStrictEqual(["packages-refresh-2"]);
  });

  it("attempts packages before reporting a contributions failure", async () => {
    const started: string[] = [];

    await expect(
      startPeriodicRefreshes(7_200_000, {
        CONTRIBUTIONS_REFRESH: {
          create: async () => await Promise.reject(new Error("unavailable")),
        },
        PACKAGES_REFRESH: {
          create: async ({ id }) => {
            started.push(id);

            return await Promise.resolve({ id });
          },
        },
      })
    ).rejects.toThrow("failed to start");

    expect(started).toStrictEqual(["packages-refresh-2"]);
  });

  it("attempts contributions when packages fails", async () => {
    const started: string[] = [];

    await expect(
      startPeriodicRefreshes(7_200_000, {
        CONTRIBUTIONS_REFRESH: {
          create: async ({ id }) => {
            started.push(id);

            return await Promise.resolve({ id });
          },
        },
        PACKAGES_REFRESH: {
          create: async () => await Promise.reject(new Error("unavailable")),
        },
      })
    ).rejects.toThrow("failed to start");

    expect(started).toStrictEqual(["contributions-refresh-2"]);
  });
});
