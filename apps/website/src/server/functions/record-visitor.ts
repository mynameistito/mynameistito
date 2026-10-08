import { Effect, Option, Schema } from "effect";

import { getAppEnv } from "@/env";
import { VisitorCountsSchema } from "@/lib/visitor-counting";
import type { VisitorCounts } from "@/lib/visitor-counting";

/** Records a visit through the configured visitor Worker.
 * @param existingVisitorId - Valid visitor identifier from the request cookie, if present.
 * @returns The visitor identifier and parsed counts, or `null` if unavailable.
 */
export const recordVisitor = Effect.fn("recordVisitor")(function* recordVisitor(
  existingVisitorId?: string
) {
  const visitorId =
    existingVisitorId ?? (yield* Effect.sync(() => crypto.randomUUID()));
  const env = yield* getAppEnv().pipe(Effect.option);
  if (Option.isNone(env)) {
    return null;
  }
  const visitorService = env.value.VISITOR_SERVICE;
  if (!visitorService) {
    return null;
  }
  const response = yield* Effect.tryPromise(() =>
    visitorService.fetch(
      new Request("https://visitor-service.internal/track", {
        body: JSON.stringify({ visitorId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    )
  ).pipe(Effect.option);
  if (Option.isNone(response) || !response.value.ok) {
    return null;
  }
  const payload = yield* Effect.tryPromise(() => response.value.json()).pipe(
    Effect.option
  );
  if (Option.isNone(payload)) {
    return null;
  }
  const counts = yield* Schema.decodeUnknownEffect(VisitorCountsSchema)(
    payload.value
  ).pipe(Effect.option);
  if (Option.isNone(counts)) {
    return null;
  }
  return { counts: counts.value satisfies VisitorCounts, visitorId };
});
