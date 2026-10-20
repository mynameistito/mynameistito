import { Context, DateTime, Effect, Layer, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import { getAppEnv } from "@/env";
import type { AppEnv } from "@/env";
import { profile } from "@/lib/profile";
import { NpmRegistryError } from "@/lib/provider/npm/errors";

/** Public npm package metadata displayed on the packages page. */
export interface NpmPackage {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly weeklyDownloads: number;
  readonly npmUrl: string;
  readonly repositoryUrl?: string;
}

const NpmPackageSchema = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  version: Schema.String,
  weeklyDownloads: Schema.Int,
  npmUrl: Schema.String,
  repositoryUrl: Schema.optional(Schema.String),
});

const SearchResponseSchema = Schema.Struct({
  objects: Schema.Array(
    Schema.Struct({
      downloads: Schema.Struct({ weekly: Schema.Int }),
      package: Schema.Struct({
        name: Schema.String,
        version: Schema.String,
        description: Schema.optional(Schema.String),
        links: Schema.optional(
          Schema.Struct({
            npm: Schema.optional(Schema.String),
            repository: Schema.optional(Schema.String),
          })
        ),
      }),
    })
  ),
});

/** Npm registry operations used by the package snapshot workflow. */
export class NpmRegistry extends Context.Service<
  NpmRegistry,
  {
    readonly search: Effect.Effect<readonly NpmPackage[], NpmRegistryError>;
  }
>()("website/provider/NpmRegistry") {
  /** Creates the registry adapter using the public npm search API. */
  static readonly layer = Layer.effect(
    NpmRegistry,
    Effect.gen(function* createNpmRegistry() {
      const client = yield* HttpClient.HttpClient;

      const search = Effect.fn("NpmRegistry.search")(function* search() {
        const url = new URL("https://registry.npmjs.org/-/v1/search");
        url.searchParams.set("text", `maintainer:${profile.npm}`);
        url.searchParams.set("size", "250");

        const response = yield* client
          .pipe(HttpClient.filterStatusOk)
          .get(url.toString())
          .pipe(Effect.mapError((cause) => new NpmRegistryError({ cause })));

        const result = yield* HttpClientResponse.schemaBodyJson(
          SearchResponseSchema
        )(response).pipe(
          Effect.mapError((cause) => new NpmRegistryError({ cause }))
        );

        const packages = result.objects.map(
          ({ downloads, package: registryPackage }): NpmPackage => {
            const item: NpmPackage = {
              name: registryPackage.name,
              description:
                registryPackage.description ?? "No description provided.",
              version: registryPackage.version,
              weeklyDownloads: downloads.weekly,
              npmUrl:
                registryPackage.links?.npm ??
                `https://www.npmjs.com/package/${encodeURIComponent(registryPackage.name)}`,
            };

            const repository = registryPackage.links?.repository;

            if (repository !== undefined && repository.length > 0) {
              const repositoryUrl = repository
                .replace(/^git\+https:/u, "https:")
                .replace(/\.git$/u, "");

              return { ...item, repositoryUrl };
            }

            return item;
          }
        );

        return packages.toSorted(
          (first, second) => second.weeklyDownloads - first.weeklyDownloads
        );
      })();

      return NpmRegistry.of({ search });
    })
  ).pipe(Layer.provide(FetchHttpClient.layer));
}

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
  function* refreshPackages(
    env: AppEnv,
    npmRegistryLayer: Layer.Layer<NpmRegistry> = NpmRegistry.layer
  ) {
    const kv = env.OPEN_SOURCE_KV;

    if (!kv) {
      return yield* Effect.fail(
        new Error("The package KV snapshot binding is not configured.")
      );
    }

    const packages = yield* Effect.gen(function* fetchPackages() {
      const registry = yield* NpmRegistry;

      return yield* registry.search;
    }).pipe(
      Effect.provide(npmRegistryLayer),
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
