import { Context, Effect, Layer, Redacted, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

import { MDFromXRequestError } from "@/lib/provider/mdfromx/errors";

export { MDFromXRequestError } from "@/lib/provider/mdfromx/errors";

/** Public X profile metrics shown in the social hover card. */
export interface Profile {
  readonly name: string;
  readonly handle: string;
  readonly description: string;
  readonly location: string;
  readonly followers: number;
  readonly following: number;
  readonly posts: number | null;
  readonly avatarUrl: string | null;
  readonly bannerUrl: string | null;
}

const ProfileResponseSchema = Schema.Struct({
  profile: Schema.Struct({
    name: Schema.String,
    screen_name: Schema.String,
    description: Schema.String,
    location: Schema.String,
    followers: Schema.Int,
    following: Schema.Int,
    statuses: Schema.optional(Schema.Int),
    avatar_url: Schema.String,
    banner_url: Schema.String,
  }),
});

/** Parses an MDFromX profile response into the values used by the site.
 * @param input - Untrusted JSON returned by the MDFromX profile endpoint.
 * @returns The parsed public profile.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- SAFETY: This untrusted JSON is decoded against ProfileResponseSchema before use.
export const decodeProfileResponse = Effect.fn("MDFromX.decodeProfileResponse")(
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- SAFETY: input is schema-decoded before use.
  function* decodeProfileResponse(input: unknown) {
    const response = yield* Schema.decodeUnknownEffect(ProfileResponseSchema)(
      input
    ).pipe(
      Effect.mapError(
        (cause) => new MDFromXRequestError({ operation: "profile", cause })
      )
    );
    const { profile } = response;
    return {
      name: profile.name,
      handle: profile.screen_name,
      description: profile.description,
      location: profile.location,
      followers: profile.followers,
      following: profile.following,
      posts: profile.statuses ?? null,
      avatarUrl: profile.avatar_url || null,
      bannerUrl: profile.banner_url || null,
    } satisfies Profile;
  }
);

/** MDFromX profile lookup capability. */
export class MDFromX extends Context.Service<
  MDFromX,
  {
    readonly profile: (
      handle: string
    ) => Effect.Effect<Profile, MDFromXRequestError>;
  }
>()("mynameistito/website/provider/MDFromX") {
  /** Constructs the MDFromX adapter with an optional API key.
   * @param apiKey - The optional redacted MDFromX API key.
   * @returns A layer with the HttpClient requirement still available.
   */
  static readonly layerWithoutDependencies = (
    apiKey?: Redacted.Redacted<string>
  ) =>
    Layer.effect(
      MDFromX,
      Effect.gen(function* layerWithoutDependencies() {
        const httpClient = (yield* HttpClient.HttpClient).pipe(
          HttpClient.filterStatusOk
        );
        const profile = Effect.fn("MDFromX.profile")(function* profile(
          handle: string
        ) {
          let request = HttpClientRequest.get(
            `https://mdfromx.com/api/v1/profiles/${encodeURIComponent(handle)}?full=true&format=json`
          ).pipe(HttpClientRequest.setHeader("Accept", "application/json"));
          if (apiKey) {
            request = HttpClientRequest.setHeader(
              request,
              "Authorization",
              `Bearer ${Redacted.value(apiKey)}`
            );
          }
          const payload = yield* httpClient.execute(request).pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Unknown)),
            Effect.mapError(
              (cause) =>
                new MDFromXRequestError({ operation: "profile", cause })
            )
          );
          return yield* decodeProfileResponse(payload);
        });
        return MDFromX.of({ profile });
      })
    );

  /** Provides the fetch-backed HttpClient for the MDFromX adapter.
   * @param apiKey - The optional redacted MDFromX API key.
   * @returns A fully assembled MDFromX provider layer.
   */
  static readonly layer = (apiKey?: Redacted.Redacted<string>) =>
    MDFromX.layerWithoutDependencies(apiKey).pipe(
      Layer.provide(FetchHttpClient.layer)
    );
}
