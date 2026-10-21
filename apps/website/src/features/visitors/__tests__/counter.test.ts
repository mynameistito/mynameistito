import type {
  DurableObjectState,
  DurableObjectStorage,
  DurableObjectValue,
} from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RuntimeBindings } from "@/env";
import { VisitorCounter } from "@/features/visitors/counter";
import { heartbeatMs, liveWindowMs } from "@/features/visitors/counting";

const createStorage = (
  initial: ReadonlyMap<string, DurableObjectValue> = new Map()
) => {
  const values = new Map(initial);
  let livePrefixListCalls = 0;
  let transactionTail: Promise<unknown> = Promise.resolve();

  const storage: DurableObjectStorage = {
    delete: async (key: string) => await Promise.resolve(values.delete(key)),
    async get<T>(key: string): Promise<T | undefined> {
      const value = values.get(key);

      if (value === undefined) {
        // eslint-disable-next-line unicorn/no-useless-undefined -- SAFETY: Missing keys use the Durable Object storage contract.
        return await Promise.resolve<T | undefined>(undefined);
      }

      // SAFETY: This in-memory adapter stores values under their typed Durable Object keys.
      // eslint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Test reads use the key's persisted type.
      return await Promise.resolve(value as T);
    },
    async list<T>(
      options: { readonly prefix?: string } = {}
    ): Promise<Map<string, T>> {
      if (options.prefix === "live:") {
        livePrefixListCalls += 1;
      }

      const listedValues = new Map(
        [...values].filter(([key]) =>
          options.prefix === undefined ? true : key.startsWith(options.prefix)
        )
      );

      // SAFETY: The caller supplies a prefix and value type matching this test store's keys.
      // eslint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Tests populate numeric live leases and typed counts.
      return await Promise.resolve(listedValues as Map<string, T>);
    },
    async put(key, value): Promise<void> {
      values.set(key, value);
      await Promise.resolve();
    },
    async setAlarm(time): Promise<void> {
      values.set("alarm", time);
      await Promise.resolve();
    },
    async transaction<T>(
      run: (transaction: DurableObjectStorage) => Promise<T>
    ): Promise<T> {
      // SAFETY: A promise tail serializes this in-memory Durable Object transaction adapter.
      // eslint-disable-next-line github/no-then -- SAFETY: The queue runs one transaction after its predecessor.
      const result = transactionTail.then(async () => await run(storage));

      // eslint-disable-next-line github/no-then -- SAFETY: Failed transactions must not block the next queued transaction.
      transactionTail = result.catch(() => {});

      return await result;
    },
  };

  return {
    storage,
    values,
    get livePrefixListCalls() {
      return livePrefixListCalls;
    },
  };
};

const createCounter = (storage: DurableObjectStorage): VisitorCounter => {
  const context: DurableObjectState = { storage };
  const runtimeBindings: RuntimeBindings = {};

  // @ts-expect-error Test provides the Durable Object state used by this class.
  return new VisitorCounter(context, runtimeBindings);
};

describe("visitor counter live-count aggregate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("migrates active and expired legacy leases once, then heartbeats without listing", async () => {
    const now = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const database = createStorage(
      new Map([
        ["live:legacy-active", now - liveWindowMs],
        ["live:legacy-expired", now - liveWindowMs - 1],
      ])
    );

    const counter = createCounter(database.storage);

    await counter.track("new-visitor");
    const repeated = await counter.track("new-visitor");

    expect({
      initialized: database.values.get("liveCountInitialized"),
      legacyExpiredLeaseRemains: database.values.has("live:legacy-expired"),
      liveCount: database.values.get("liveCount"),
      prefixListCalls: database.livePrefixListCalls,
      repeatedLiveCount: repeated.live,
    }).toStrictEqual({
      initialized: true,
      legacyExpiredLeaseRemains: false,
      liveCount: 2,
      prefixListCalls: 1,
      repeatedLiveCount: 2,
    });
  });

  it("serializes simultaneous first heartbeats through one migration", async () => {
    const now = 2_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const database = createStorage(
      new Map([["live:legacy", now - liveWindowMs]])
    );

    const counter = createCounter(database.storage);

    const results = await Promise.all([
      counter.track("first"),
      counter.track("second"),
    ]);

    expect({
      counts: results.map(({ live }) => live),
      liveCount: database.values.get("liveCount"),
      prefixListCalls: database.livePrefixListCalls,
    }).toStrictEqual({
      counts: [2, 3],
      liveCount: 3,
      prefixListCalls: 1,
    });
  });

  it("initializes on the first alarm and removes expired legacy leases", async () => {
    const now = 3_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);

    const database = createStorage(
      new Map([
        ["live:active", now - liveWindowMs],
        ["live:expired", now - liveWindowMs - 1],
      ])
    );

    const counter = createCounter(database.storage);

    await counter.alarm();

    expect({
      alarm: database.values.get("alarm"),
      expiredLeaseRemains: database.values.has("live:expired"),
      initialized: database.values.get("liveCountInitialized"),
      liveCount: database.values.get("liveCount"),
      prefixListCalls: database.livePrefixListCalls,
    }).toStrictEqual({
      alarm: now + heartbeatMs,
      expiredLeaseRemains: false,
      initialized: true,
      liveCount: 1,
      prefixListCalls: 1,
    });
  });

  it("keeps repeats and the exact expiry boundary active, then renews an expired own lease", async () => {
    const start = 4_000_000;
    vi.spyOn(Date, "now").mockReturnValue(start);
    const database = createStorage();
    const counter = createCounter(database.storage);

    const first = await counter.track("a");
    const repeat = await counter.track("a");
    const secondVisitor = await counter.track("b");

    vi.mocked(Date.now).mockReturnValue(start + liveWindowMs);
    const boundary = await counter.track("a");

    vi.mocked(Date.now).mockReturnValue(start + liveWindowMs + 1);
    const renewed = await counter.track("a");

    expect({
      counts: [
        first.live,
        repeat.live,
        secondVisitor.live,
        boundary.live,
        renewed.live,
      ],
      liveCount: database.values.get("liveCount"),
      prefixListCalls: database.livePrefixListCalls,
    }).toStrictEqual({
      counts: [1, 1, 2, 2, 2],
      liveCount: 2,
      prefixListCalls: 1,
    });
  });

  it("decrements expired leases in an alarm once without underflow", async () => {
    const start = 5_000_000;
    vi.spyOn(Date, "now").mockReturnValue(start);
    const database = createStorage();
    const counter = createCounter(database.storage);

    await counter.track("a");
    await counter.track("b");
    vi.mocked(Date.now).mockReturnValue(start + liveWindowMs + 1);

    await counter.alarm();

    const firstCleanup = {
      count: database.values.get("liveCount"),
      leaseAExists: database.values.has("live:a"),
      leaseBExists: database.values.has("live:b"),
    };

    await counter.alarm();

    expect({
      finalCount: database.values.get("liveCount"),
      firstCleanup,
      prefixListCalls: database.livePrefixListCalls,
    }).toStrictEqual({
      finalCount: 0,
      firstCleanup: { count: 0, leaseAExists: false, leaseBExists: false },
      prefixListCalls: 3,
    });
  });
});
