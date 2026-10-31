import { Context, Effect, Layer, Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import { profile } from "@/domain/profile";
import type { NpmPackage } from "@/features/packages/package";
import { NpmRegistryError } from "@/integrations/npm/errors";

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

/** npm registry capability used by the package snapshot operation. */
export class NpmRegistry extends Context.Service<
  NpmRegistry,
  {
    readonly search: Effect.Effect<readonly NpmPackage[], NpmRegistryError>;
  }
>()("website/provider/NpmRegistry") {
  /** Builds the adapter while retaining its HttpClient requirement. */
  static readonly layerWithoutDependencies = Layer.effect(
    NpmRegistry,
    Effect.gen(function* makeNpmRegistry() {
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
              return {
                ...item,
                repositoryUrl: repository
                  .replace(/^git\+https:/u, "https:")
                  .replace(/\.git$/u, ""),
              };
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
  );

  /** Builds the registry adapter with the platform Fetch implementation. */
  static readonly layer = NpmRegistry.layerWithoutDependencies.pipe(
    Layer.provide(FetchHttpClient.layer)
  );
}
