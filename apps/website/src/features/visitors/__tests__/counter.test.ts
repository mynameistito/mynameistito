import type {
  DurableObjectState,
  DurableObjectStorage,
  DurableObjectValue,
} from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DurableObject } from "@/__tests__/cloudflare-workers";
import type { RuntimeBindings } from "@/env";
import { VisitorCounter } from "@/features/visitors/counter";
import { heartbeatMs, liveWindowMs } from "@/features/visitors/counting";

const createStorage = (
  initial: ReadonlyMap<string, DurableObjectValue> = new Map()
) => {
  const values = new Map(initial);
  let livePrefixListCalls = 0;
  let transactionTail: Promise<null> = Promise.resolve(null);

  const storage = {
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
    async getAlarm(): Promise<number | null> {
      const alarm = values.get("alarm");

      return alarm === undefined ? null : await Promise.resolve(Number(alarm));
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
      const previousTransaction = transactionTail;
      const transactionGate = Promise.withResolvers<null>();
      transactionTail = transactionGate.promise;

      await previousTransaction;

      try {
        return await run(storage);
      } finally {
        transactionGate.resolve(null);
      }
    },
  } satisfies DurableObjectStorage & {
    readonly getAlarm: () => Promise<number | null>;
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

  it("preserves bindings supplied to the Durable Object test seam", () => {
    const database = createStorage();
    const bindings = { name: "test-binding" };
    const object = new DurableObject({ storage: database.storage }, bindings);

    expect(object.env).toBe(bindings);
    expect(object.ctx.storage).toBe(database.storage);
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
      alarm: database.values.get("alarm"),
    }).toStrictEqual({
      counts: [2, 3],
      liveCount: 3,
      prefixListCalls: 1,
      alarm: now + heartbeatMs,
    });
  });

  it("keeps the earliest cleanup deadline for simultaneous first heartbeats", async () => {
    const start = 2_500_000;
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(start + heartbeatMs - 1)
      .mockReturnValueOnce(start);
    const database = createStorage();
    const counter = createCounter(database.storage);

    await Promise.all([counter.track("later"), counter.track("earlier")]);

    expect(database.values.get("alarm")).toBe(start + heartbeatMs);
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
    const renewed = await counter.track("b");

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

  it("does not postpone an existing cleanup alarm during repeated heartbeats", async () => {
    const start = 4_500_000;
    const cleanupDeadline = start + heartbeatMs;
    vi.spyOn(Date, "now").mockReturnValue(start);
    const database = createStorage(new Map([["alarm", cleanupDeadline]]));
    const counter = createCounter(database.storage);

    await counter.track("a");
    vi.mocked(Date.now).mockReturnValue(start + heartbeatMs / 2);
    await counter.track("a");
    vi.mocked(Date.now).mockReturnValue(start + heartbeatMs - 1);
    await counter.track("a");

    expect(database.values.get("alarm")).toBe(cleanupDeadline);
  });

  it("does not postpone an existing cleanup alarm during concurrent heartbeats", async () => {
    const start = 4_750_000;
    const cleanupDeadline = start + heartbeatMs;
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(start)
      .mockReturnValueOnce(start + heartbeatMs - 1);
    const database = createStorage(new Map([["alarm", cleanupDeadline]]));
    const counter = createCounter(database.storage);

    await Promise.all([counter.track("a"), counter.track("b")]);

    expect(database.values.get("alarm")).toBe(cleanupDeadline);
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

  it("reconciles the live-count aggregate from all leases during cleanup", async () => {
    const now = 5_500_000;

    vi.spyOn(Date, "now").mockReturnValue(now);

    const database = createStorage(
      new Map<string, DurableObjectValue>([
        ["live:a", now],
        ["live:b", now - liveWindowMs],
        ["liveCount", 99],
        ["liveCountInitialized", true],
      ])
    );

    const counter = createCounter(database.storage);

    await counter.alarm();

    expect({
      alarm: database.values.get("alarm"),
      liveCount: database.values.get("liveCount"),
      prefixListCalls: database.livePrefixListCalls,
    }).toStrictEqual({
      alarm: now + heartbeatMs,
      liveCount: 2,
      prefixListCalls: 1,
    });
  });
});
