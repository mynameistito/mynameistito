import { Context, Effect, Layer, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

import { TokscaleRequestError } from "./errors";

export { TokscaleRequestError } from "./errors";

/** Token/cost totals reported for one model by Tokscale. */
interface ModelUsage {
  readonly cost: number;
  readonly input: number;
  readonly output: number;
  readonly tokens: number;
  readonly messages: number;
  readonly cacheRead: number;
  readonly reasoning: number;
  readonly cacheWrite: number;
}

const ModelUsageSchema = Schema.Struct({
  cost: Schema.Number,
  input: Schema.Number,
  output: Schema.Number,
  tokens: Schema.Number,
  messages: Schema.Number,
  cacheRead: Schema.Number,
  reasoning: Schema.Number,
  cacheWrite: Schema.Number,
});

/** Daily provider/harness usage included with each Tokscale contribution. */
interface ClientUsage {
  readonly client: string;
  readonly modelId: string;
  readonly models: Readonly<Record<string, ModelUsage>>;
  readonly tokens: Omit<ModelUsage, "cost" | "tokens" | "messages">;
  readonly cost: number;
  readonly messages: number;
}

const ClientUsageSchema = Schema.Struct({
  client: Schema.String,
  modelId: Schema.String,
  models: Schema.Record(Schema.String, ModelUsageSchema),
  tokens: Schema.Struct({
    input: Schema.Number,
    output: Schema.Number,
    cacheRead: Schema.Number,
    cacheWrite: Schema.Number,
    reasoning: Schema.Number,
  }),
  cost: Schema.Number,
  messages: Schema.Number,
});

/** One day's aggregate activity in the Tokscale contribution calendar. */
export interface DailyUsage {
  readonly date: string;
  readonly totals: {
    readonly tokens: number;
    readonly cost: number;
    readonly messages: number;
  };
  readonly intensity: number;
  readonly tokenBreakdown: {
    readonly input: number;
    readonly output: number;
    readonly cacheRead: number;
    readonly cacheWrite: number;
    readonly reasoning: number;
  };
  readonly clients: readonly ClientUsage[];
}

const DailyUsageSchema = Schema.Struct({
  date: Schema.String,
  totals: Schema.Struct({
    tokens: Schema.Number,
    cost: Schema.Number,
    messages: Schema.Number,
  }),
  intensity: Schema.Number,
  tokenBreakdown: Schema.Struct({
    input: Schema.Number,
    output: Schema.Number,
    cacheRead: Schema.Number,
    cacheWrite: Schema.Number,
    reasoning: Schema.Number,
  }),
  clients: Schema.Array(ClientUsageSchema),
});

/** Public usage profile returned by Tokscale's user endpoint. */
export interface TokscaleProfile {
  readonly stats: {
    readonly totalTokens: number;
    readonly totalCost: number;
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteTokens: number;
    readonly reasoningTokens: number;
    readonly submissionCount: number;
    readonly activeDays: number;
    readonly sessionCount: number;
  };
  readonly updatedAt: string;
  readonly modelUsage: readonly {
    readonly model: string;
    readonly tokens: number;
    readonly cost: number;
    readonly percentage: number;
  }[];
  readonly contributions: readonly DailyUsage[];
}

export const TokscaleProfileSchema = Schema.Struct({
  stats: Schema.Struct({
    totalTokens: Schema.Number,
    totalCost: Schema.Number,
    inputTokens: Schema.Number,
    outputTokens: Schema.Number,
    cacheReadTokens: Schema.Number,
    cacheWriteTokens: Schema.Number,
    reasoningTokens: Schema.Number,
    submissionCount: Schema.Number,
    activeDays: Schema.Number,
    sessionCount: Schema.Number,
  }),
  updatedAt: Schema.String,
  modelUsage: Schema.Array(
    Schema.Struct({
      model: Schema.String,
      tokens: Schema.Number,
      cost: Schema.Number,
      percentage: Schema.Number,
    })
  ),
  contributions: Schema.Array(DailyUsageSchema),
});

/** Parses the public Tokscale response at the untrusted-data boundary.
 * @param input - The unknown JSON returned by Tokscale.
 * @returns A validated profile with the fields consumed by this website.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- SAFETY: Untrusted JSON is schema-decoded before use.
export const decodeTokscaleResponse = Effect.fn("Tokscale.decodeResponse")(
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- SAFETY: Decode unknown provider data before using it.
  function* decodeTokscaleResponse(input: unknown) {
    return yield* Schema.decodeUnknownEffect(TokscaleProfileSchema)(input).pipe(
      Effect.mapError(
        (cause) => new TokscaleRequestError({ operation: "decode", cause })
      )
    );
  }
);

/** Tokscale user-profile lookup capability. */
export class Tokscale extends Context.Service<
  Tokscale,
  {
    readonly profile: (
      username: string
    ) => Effect.Effect<TokscaleProfile, TokscaleRequestError>;
  }
>()("mynameistito/website/provider/Tokscale") {
  /** Constructs the provider using an HttpClient supplied by its caller.
   * @returns A layer retaining the HttpClient requirement.
   */
  static readonly layerWithoutDependencies = () =>
    Layer.effect(
      Tokscale,
      Effect.gen(function* layerWithoutDependencies() {
        const httpClient = (yield* HttpClient.HttpClient).pipe(
          HttpClient.filterStatusOk
        );
        const profile = Effect.fn("Tokscale.profile")(function* profile(
          username: string
        ) {
          const request = HttpClientRequest.get(
            `https://tokscale.ai/api/users/${encodeURIComponent(username)}`
          ).pipe(HttpClientRequest.setHeader("Accept", "application/json"));
          const payload = yield* httpClient.execute(request).pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(Schema.Unknown)),
            Effect.mapError(
              (cause) =>
                new TokscaleRequestError({ operation: "profile", cause })
            )
          );
          return yield* decodeTokscaleResponse(payload);
        });
        return Tokscale.of({ profile });
      })
    );

  /** Builds a complete fetch-backed Tokscale provider layer. */
  /** Builds a complete fetch-backed Tokscale provider layer.
   * @returns A Tokscale provider backed by the platform Fetch API.
   */
  static readonly layer = () =>
    Tokscale.layerWithoutDependencies().pipe(
      Layer.provide(FetchHttpClient.layer)
    );
}
