import type {
  DurableObjectState,
  DurableObjectStorage,
  DurableObjectValue,
} from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";

import type { RuntimeBindings } from "@/env";
import { GitHubSearchRateLimiter } from "@/lib/github-search-rate-limiter";

describe("GitHub Search API Durable Object rate limiter", () => {
  it("persists a reservation through transactional storage", async () => {
    let savedKey = "";
    let savedValue: DurableObjectValue = 0;

    const transaction: DurableObjectStorage = {
      delete: async () => await Promise.resolve(false),
      async get<T>(_key: string): Promise<T | undefined> {
        // eslint-disable-next-line unicorn/no-useless-undefined -- Missing value is the storage contract for a new bucket.
        return await Promise.resolve<T | undefined>(undefined);
      },
      list: async () => await Promise.resolve(new Map()),
      put: async (key, value) => {
        savedKey = key;
        savedValue = value;

        await Promise.resolve();
      },
      setAlarm: async () => {
        await Promise.resolve();
      },
      transaction: async (run) => await run(transaction),
    };

    const storage: DurableObjectStorage = {
      ...transaction,
      transaction: async (run) => await run(transaction),
    };

    const context: DurableObjectState = { storage };
    const runtimeBindings: RuntimeBindings = {};
    // @ts-expect-error Test supplies the Durable Object storage API exercised by this class.
    const limiter = new GitHubSearchRateLimiter(context, runtimeBindings);
    vi.spyOn(Date, "now").mockReturnValue(1000);

    const delayMs = await limiter.reserveSlot(6100);

    expect(delayMs).toBe(0);
    expect(savedKey).toBe("nextAllowedAt");
    expect(savedValue).toBe(7100);
    vi.restoreAllMocks();
  });
});
