import { Effect, Layer, Schema } from "effect";
import { TestClock } from "effect/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppEnv } from "@/env";
import type { OpenSourceKVBinding, PackagesRefreshBinding } from "@/env";
import { loadPackages, refreshPackages } from "@/features/packages/packages";
import type { NpmPackage } from "@/features/packages/packages";
import { NpmRegistry } from "@/integrations/npm/client";

const snapshotKey = "npm:packages:v1";

const runWithClock = async <A, E>(program: Effect.Effect<A, E>) =>
  await Effect.runPromise(
    Effect.andThen(
      TestClock.setTime(Date.parse("2026-10-21T00:00:00Z")),
      program
    ).pipe(Effect.provide(TestClock.layer()))
  );

const StoredPackagesSchema = Schema.Struct({
  refreshedAt: Schema.String,
  packages: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      description: Schema.String,
      version: Schema.String,
      weeklyDownloads: Schema.Number,
      npmUrl: Schema.String,
      repositoryUrl: Schema.optional(Schema.String),
    })
  ),
});

const decodeStoredPackages = (snapshot: string | undefined) => {
  if (snapshot === undefined) {
    throw new Error("The packages snapshot was not written.");
  }

  return Schema.decodeUnknownSync(Schema.fromJsonString(StoredPackagesSchema))(
    snapshot
  );
};

const npmPackage: NpmPackage = {
  name: "useful-package",
  description: "A useful package.",
  version: "1.2.3",
  weeklyDownloads: 42,
  npmUrl: "https://www.npmjs.com/package/useful-package",
  repositoryUrl: "https://github.com/example/useful-package",
};

const createKV = (initial?: string) => {
  const values = new Map<string, string>();

  if (initial !== undefined) {
    values.set(snapshotKey, initial);
  }

  const binding: OpenSourceKVBinding = {
    get: async (key) => await Promise.resolve(values.get(key) ?? null),
    put: async (key, value) => {
      await Promise.resolve();
      values.set(key, value);
    },
  };

  return { binding, values };
};

const createRegistryLayer = (packages: readonly NpmPackage[]) =>
  Layer.succeed(
    NpmRegistry,
    NpmRegistry.of({ search: Effect.succeed(packages) })
  );

describe("npm package snapshots", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serves a fresh KV snapshot without starting a refresh", async () => {
    const { binding } = createKV(
      JSON.stringify({
        refreshedAt: "2099-10-10T00:00:00Z",
        packages: [npmPackage],
      })
    );

    const create = vi
      .fn<PackagesRefreshBinding["create"]>()
      .mockResolvedValue({ id: "should-not-run" });

    await expect(
      runWithClock(
        loadPackages(
          createAppEnv({
            OPEN_SOURCE_KV: binding,
            PACKAGES_REFRESH: { create },
          })
        )
      )
    ).resolves.toStrictEqual({
      packages: [npmPackage],
      refreshedAt: "2099-10-10T00:00:00Z",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("returns promptly and starts one refresh Workflow when no snapshot exists", async () => {
    const { binding } = createKV();

    const create = vi
      .fn<PackagesRefreshBinding["create"]>()
      .mockImplementation(async ({ id }) => await Promise.resolve({ id }));

    await expect(
      runWithClock(
        loadPackages(
          createAppEnv({
            OPEN_SOURCE_KV: binding,
            PACKAGES_REFRESH: { create },
          })
        )
      )
    ).resolves.toStrictEqual({ packages: [], refreshedAt: null });
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0]?.[0].params).toStrictEqual({});
    expect(create.mock.calls[0]?.[0].id).toMatch(/^packages-refresh-\d+$/u);
  });

  it("serves stale data while scheduling a refresh", async () => {
    const { binding } = createKV(
      JSON.stringify({
        refreshedAt: "2000-01-01T00:00:00Z",
        packages: [npmPackage],
      })
    );

    const create = vi
      .fn<PackagesRefreshBinding["create"]>()
      .mockImplementation(async ({ id }) => await Promise.resolve({ id }));

    await expect(
      runWithClock(
        loadPackages(
          createAppEnv({
            OPEN_SOURCE_KV: binding,
            PACKAGES_REFRESH: { create },
          })
        )
      )
    ).resolves.toStrictEqual({
      packages: [npmPackage],
      refreshedAt: "2000-01-01T00:00:00Z",
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it.each([
    ["malformed JSON", "{"],
    ["invalid snapshot structure", JSON.stringify({ packages: [npmPackage] })],
  ])(
    "omits freshness for %s and starts a refresh",
    async (_label, snapshot) => {
      const { binding } = createKV(snapshot);

      const create = vi
        .fn<PackagesRefreshBinding["create"]>()
        .mockImplementation(async ({ id }) => await Promise.resolve({ id }));

      await expect(
        runWithClock(
          loadPackages(
            createAppEnv({
              OPEN_SOURCE_KV: binding,
              PACKAGES_REFRESH: { create },
            })
          )
        )
      ).resolves.toStrictEqual({ packages: [], refreshedAt: null });
      expect(create).toHaveBeenCalledOnce();
    }
  );

  it("serves packages without freshness for an invalid stored timestamp", async () => {
    const { binding } = createKV(
      JSON.stringify({ refreshedAt: "invalid", packages: [npmPackage] })
    );

    const create = vi
      .fn<PackagesRefreshBinding["create"]>()
      .mockImplementation(async ({ id }) => await Promise.resolve({ id }));

    await expect(
      runWithClock(
        loadPackages(
          createAppEnv({
            OPEN_SOURCE_KV: binding,
            PACKAGES_REFRESH: { create },
          })
        )
      )
    ).resolves.toStrictEqual({ packages: [npmPackage], refreshedAt: null });
    expect(create).toHaveBeenCalledOnce();
  });

  it("omits freshness when the KV binding is unavailable", async () => {
    const create = vi.fn<PackagesRefreshBinding["create"]>();

    await expect(
      runWithClock(loadPackages(createAppEnv({ PACKAGES_REFRESH: { create } })))
    ).resolves.toStrictEqual({ packages: [], refreshedAt: null });
    expect(create).not.toHaveBeenCalled();
  });

  it("omits freshness when reading KV fails", async () => {
    const { binding } = createKV();
    const create = vi.fn<PackagesRefreshBinding["create"]>();

    const unavailableKV: OpenSourceKVBinding = {
      ...binding,
      get: async () => await Promise.reject(new Error("KV unavailable")),
    };

    await expect(
      runWithClock(
        loadPackages(
          createAppEnv({
            OPEN_SOURCE_KV: unavailableKV,
            PACKAGES_REFRESH: { create },
          })
        )
      )
    ).resolves.toStrictEqual({ packages: [], refreshedAt: null });
    expect(create).not.toHaveBeenCalled();
  });

  it("retains the last good snapshot when npm returns no packages", async () => {
    const previous = JSON.stringify({
      refreshedAt: "2026-10-20T00:00:00Z",
      packages: [npmPackage],
    });

    const { binding, values } = createKV(previous);

    await expect(
      runWithClock(
        refreshPackages(createAppEnv({ OPEN_SOURCE_KV: binding })).pipe(
          Effect.provide(createRegistryLayer([]))
        )
      )
    ).rejects.toMatchObject({ _tag: "NpmRegistryError" });

    expect(values.get(snapshotKey)).toBe(previous);
  });

  it("publishes a complete snapshot after a successful registry fetch", async () => {
    const { binding, values } = createKV();

    const result = await runWithClock(
      refreshPackages(createAppEnv({ OPEN_SOURCE_KV: binding })).pipe(
        Effect.provide(createRegistryLayer([npmPackage]))
      )
    );

    expect(result.packageCount).toBe(1);
    expect(result.packages).toStrictEqual([
      {
        name: npmPackage.name,
        version: npmPackage.version,
        weeklyDownloads: npmPackage.weeklyDownloads,
      },
    ]);
    const stored = decodeStoredPackages(values.get(snapshotKey));
    expect(stored).toMatchObject({ packages: [npmPackage] });
    expect(stored.refreshedAt).toStrictEqual(expect.any(String));
  });
});
