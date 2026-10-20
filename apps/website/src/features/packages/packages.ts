import { DateTime, Effect, Schema } from "effect";

import { getAppEnv } from "@/env";
import type { AppEnv } from "@/env";
import type { NpmPackage } from "@/features/packages/package";
import { NpmRegistry } from "@/integrations/npm/client";

export type { NpmPackage } from "@/features/packages/package";

/** Public npm package metadata displayed on the packages page. */
const NpmPackageSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  version: Schema.String,
  weeklyDownloads: Schema.Int,
  npmUrl: Schema.String,
  repositoryUrl: Schema.optional(Schema.String),
});

interface PackagesSnapshot {
  readonly refreshedAt: string;
  readonly packages: readonly NpmPackage[];
}

const PackagesSnapshotSchema = Schema.Struct({
  refreshedAt: Schema.String,
  packages: Schema.Array(NpmPackageSchema),
});

const snapshotKey = "npm:packages:v1";
const refreshIntervalMs = 6 * 60 * 60 * 1000;

const startPackagesRefresh = Effect.fn("startPackagesRefresh")(
  function* startPackagesRefresh(env: AppEnv) {
    const refresh = env.PACKAGES_REFRESH;

    if (!refresh) {
      console.warn(
        "[packages] Unable to start package refresh: Workflow binding is not configured."
      );

      return;
    }

    const now = yield* DateTime.now;

    const workflowId = `packages-refresh-${Math.floor(
      now.epochMilliseconds / 3_600_000
    )}`;

    const created = yield* Effect.result(
      Effect.tryPromise({
        try: async () => await refresh.create({ id: workflowId, params: {} }),
        catch: (cause) =>
          cause instanceof Error
            ? cause
            : new Error("Package refresh workflow start failed", { cause }),
      })
    );

    if (created._tag === "Failure") {
      console.warn("[packages] Unable to start package refresh.", {
        workflowId,
        error: created.failure.message,
      });
    }
  }
);

/** Reads the latest package snapshot and starts a Workflow when it is stale. */
export const loadPackages = Effect.fn("loadPackages")(function* loadPackages(
  bindings?: AppEnv
) {
  const env = bindings ?? (yield* getAppEnv());
  const kv = env.OPEN_SOURCE_KV;

  if (!kv) {
    console.error("[packages] The KV snapshot binding is not configured.");

    return [];
  }

  const stored = yield* Effect.result(
    Effect.tryPromise({
      try: async () => await kv.get(snapshotKey, "text"),
      catch: (cause) =>
        cause instanceof Error ? cause : new Error("KV read failed", { cause }),
    })
  );

  if (stored._tag === "Failure") {
    console.error("[packages] Unable to read the package snapshot.");

    return [];
  }

  const storedText = stored.success;

  if (storedText === null) {
    yield* startPackagesRefresh(env);

    return [];
  }

  const decoded = yield* Effect.result(
    Schema.decodeUnknownEffect(Schema.fromJsonString(PackagesSnapshotSchema))(
      storedText
    )
  );

  if (decoded._tag === "Failure") {
    console.error("[packages] The package snapshot is invalid.");
    yield* startPackagesRefresh(env);

    return [];
  }

  const refreshedAt = Date.parse(decoded.success.refreshedAt);
  const now = yield* DateTime.now;

  if (
    !Number.isFinite(refreshedAt) ||
    now.epochMilliseconds - refreshedAt >= refreshIntervalMs
  ) {
    yield* startPackagesRefresh(env);
  }

  return decoded.success.packages;
});

/** Fetches npm metadata and publishes one complete snapshot to KV. */
export const refreshPackages = Effect.fn("refreshPackages")(
  function* refreshPackages(env: AppEnv) {
    const kv = env.OPEN_SOURCE_KV;

    if (!kv) {
      return yield* Effect.fail(
        new Error("The package KV snapshot binding is not configured.")
      );
    }

    const registry = yield* NpmRegistry;

    const packages = yield* registry.search.pipe(
      Effect.catchTag("NpmRegistryError", (error) => {
        console.error("[packages] npm registry request failed.", {
          cause: error.cause,
        });

        return Effect.fail(error);
      })
    );

    const now = yield* DateTime.now;

    const snapshot: PackagesSnapshot = {
      refreshedAt: DateTime.formatIso(now),
      packages,
    };

    yield* Effect.tryPromise({
      try: async () => {
        await kv.put(snapshotKey, JSON.stringify(snapshot));
      },
      catch: (cause) =>
        cause instanceof Error
          ? cause
          : new Error("Unable to publish the package snapshot.", { cause }),
    });

    return {
      refreshedAt: snapshot.refreshedAt,
      packageCount: packages.length,
      packages: packages.map(({ name, version, weeklyDownloads }) => ({
        name,
        version,
        weeklyDownloads,
      })),
    };
  }
);
