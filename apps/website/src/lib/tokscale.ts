import type { Layer } from "effect";
import { DateTime, Effect, Schema } from "effect";

import { getAppEnv } from "@/env";
import type { AppEnv } from "@/env";
import { profile } from "@/lib/profile";
import {
  Tokscale,
  TokscaleProfileSchema,
} from "@/lib/providers/tokscale/client";
import type { TokscaleProfile } from "@/lib/providers/tokscale/client";

/** Validated Tokscale data published to the public portfolio. */
export interface TokscaleSnapshot {
  readonly refreshedAt: string;
  readonly data: TokscaleProfile;
}

const TokscaleSnapshotSchema = Schema.Struct({
  refreshedAt: Schema.String,
  data: TokscaleProfileSchema,
});

const snapshotKey = "ai:tokscale:v1";
const refreshIntervalMs = 36 * 60 * 60 * 1000;

const startTokscaleRefresh = Effect.fn("startTokscaleRefresh")(
  function* startTokscaleRefresh(env: AppEnv) {
    const refresh = env.TOKSCALE_REFRESH;

    if (!refresh) {
      return;
    }

    const now = yield* DateTime.now;
    const timestamp = DateTime.formatIso(now);
    const day = timestamp.slice(0, 10);
    const hour = timestamp.slice(11, 13);
    const workflowId = `tokscale-refresh-on-demand-${day}-${hour}`;

    const created = yield* Effect.result(
      Effect.tryPromise({
        try: () => refresh.create({ id: workflowId, params: {} }),
        catch: (cause) =>
          cause instanceof Error
            ? cause
            : new Error("Tokscale workflow start failed", { cause }),
      })
    );

    if (created._tag === "Success") {
      return;
    }

    const existing = yield* Effect.result(
      Effect.tryPromise({
        try: () => refresh.get(workflowId),
        catch: (cause) =>
          cause instanceof Error
            ? cause
            : new Error("Tokscale workflow lookup failed", { cause }),
      })
    );

    if (existing._tag === "Failure") {
      console.warn("[ai] Unable to start Tokscale refresh.", {
        workflowId,
        error: created.failure.message,
      });

      return;
    }

    const status = yield* Effect.result(
      Effect.tryPromise({
        try: () => existing.success.status(),
        catch: (cause) =>
          cause instanceof Error
            ? cause
            : new Error("Tokscale workflow status lookup failed", { cause }),
      })
    );

    if (status._tag === "Failure") {
      console.warn("[ai] Unable to inspect Tokscale refresh status.", {
        workflowId,
        error: status.failure.message,
      });

      return;
    }

    if (status.success.status !== "errored") {
      return;
    }

    const restarted = yield* Effect.result(
      Effect.tryPromise({
        try: () => existing.success.restart(),
        catch: (cause) =>
          cause instanceof Error
            ? cause
            : new Error("Tokscale workflow restart failed", { cause }),
      })
    );

    if (restarted._tag === "Failure") {
      console.warn("[ai] Unable to restart failed Tokscale refresh.", {
        workflowId,
        error: restarted.failure.message,
      });

      return;
    }

    console.info("[ai] Restarted failed Tokscale refresh.", { workflowId });
  }
);

/** Loads the last good usage snapshot and schedules refreshes when stale.
 * @param bindings - Optional runtime bindings supplied by a server adapter.
 * @returns The published public snapshot, or null before the first refresh.
 */
export const loadTokscale = Effect.fn("loadTokscale")(function* loadTokscale(
  bindings?: AppEnv
) {
  const env = bindings ?? (yield* getAppEnv());
  const kv = env.OPEN_SOURCE_KV;

  if (!kv) {
    return null;
  }

  const stored = yield* Effect.result(
    Effect.tryPromise({
      try: () => kv.get(snapshotKey, "text"),
      catch: (cause) =>
        cause instanceof Error ? cause : new Error("KV read failed", { cause }),
    })
  );

  if (stored._tag === "Failure") {
    console.error("[ai] Unable to read the Tokscale snapshot.");

    return null;
  }

  const storedText = stored.success;

  if (storedText === null) {
    yield* startTokscaleRefresh(env);

    return null;
  }

  const decoded = yield* Effect.result(
    Effect.try({
      try: () => JSON.parse(storedText),
      catch: (cause) =>
        cause instanceof Error
          ? cause
          : new Error("Invalid Tokscale snapshot JSON", { cause }),
    }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(TokscaleSnapshotSchema)))
  );

  if (decoded._tag === "Failure") {
    console.error("[ai] The Tokscale snapshot is invalid.");
    yield* startTokscaleRefresh(env);

    return null;
  }

  const refreshedAt = Date.parse(decoded.success.refreshedAt);
  const now = yield* DateTime.now;

  if (
    !Number.isFinite(refreshedAt) ||
    now.epochMilliseconds - refreshedAt >= refreshIntervalMs
  ) {
    yield* startTokscaleRefresh(env);
  }

  return decoded.success;
});

/** Fetches current Tokscale profile data and publishes an atomic KV snapshot.
 * @param env - Worker application bindings.
 * @param tokscaleLayer - Optional test/provider layer override.
 * @returns Snapshot timestamp and profile summary.
 */
export const refreshTokscale = Effect.fn("refreshTokscale")(
  function* refreshTokscale(
    env: AppEnv,
    tokscaleLayer?: Layer.Layer<Tokscale>
  ) {
    const kv = env.OPEN_SOURCE_KV;

    if (!kv) {
      return yield* Effect.fail(
        new Error("The Tokscale KV snapshot binding is not configured.")
      );
    }

    const data = yield* Effect.gen(function* fetchTokscaleProfile() {
      const tokscale = yield* Tokscale;

      return yield* tokscale.profile(profile.tokscale);
    }).pipe(
      Effect.provide(tokscaleLayer ?? Tokscale.layer()),
      Effect.catchTag("TokscaleRequestError", (error) => {
        console.error(`[ai] Tokscale ${error.operation} failed.`, {
          cause: error.cause,
        });

        return Effect.fail(error);
      })
    );

    const now = yield* DateTime.now;

    const snapshot: TokscaleSnapshot = {
      refreshedAt: DateTime.formatIso(now),
      data,
    };

    yield* Effect.tryPromise({
      try: () => kv.put(snapshotKey, JSON.stringify(snapshot)),
      catch: (cause) =>
        cause instanceof Error
          ? cause
          : new Error("Unable to publish the Tokscale snapshot.", { cause }),
    });

    return {
      refreshedAt: snapshot.refreshedAt,
      contributionDays: data.contributions.length,
      totalTokens: data.stats.totalTokens,
    };
  }
);
