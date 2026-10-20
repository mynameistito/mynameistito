import { Effect, Layer, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppEnv } from "@/env";
import type { OpenSourceKVBinding, PackagesRefreshBinding } from "@/env";
import { loadPackages, NpmRegistry, refreshPackages } from "@/lib/packages";
import type { NpmPackage } from "@/lib/packages";

const snapshotKey = "npm:packages:v1";

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
      Effect.runPromise(
        loadPackages(
          createAppEnv({
            OPEN_SOURCE_KV: binding,
            PACKAGES_REFRESH: { create },
          })
        )
      )
    ).resolves.toStrictEqual([npmPackage]);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns promptly and starts one refresh Workflow when no snapshot exists", async () => {
    const { binding } = createKV();

    const create = vi
      .fn<PackagesRefreshBinding["create"]>()
      .mockImplementation(async ({ id }) => await Promise.resolve({ id }));

    await expect(
      Effect.runPromise(
        loadPackages(
          createAppEnv({
            OPEN_SOURCE_KV: binding,
            PACKAGES_REFRESH: { create },
          })
        )
      )
    ).resolves.toStrictEqual([]);
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
      Effect.runPromise(
        loadPackages(
          createAppEnv({
            OPEN_SOURCE_KV: binding,
            PACKAGES_REFRESH: { create },
          })
        )
      )
    ).resolves.toStrictEqual([npmPackage]);
    expect(create).toHaveBeenCalledOnce();
  });

  it("publishes a complete snapshot after a successful registry fetch", async () => {
    const { binding, values } = createKV();

    const result = await Effect.runPromise(
      refreshPackages(
        createAppEnv({ OPEN_SOURCE_KV: binding }),
        createRegistryLayer([npmPackage])
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
