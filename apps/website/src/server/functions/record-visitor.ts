import { Effect, Option, Schema } from "effect";

import { getAppEnv } from "@/env";
import { VisitorCountsSchema } from "@/lib/visitor-counting";
import type { VisitorCounts } from "@/lib/visitor-counting";

/** Records a visit through the visitor counter Durable Object.
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
  const visitorCounter = env.value.VISITOR_COUNTER;
  if (!visitorCounter) {
    return null;
  }
  const response = yield* Effect.tryPromise(() =>
    visitorCounter.getByName("site").track(visitorId)
  ).pipe(Effect.option);
  if (Option.isNone(response)) {
    return null;
  }
  const counts = yield* Schema.decodeUnknownEffect(VisitorCountsSchema)(
    response.value
  ).pipe(Effect.option);
  if (Option.isNone(counts)) {
    return null;
  }
  return { counts: counts.value satisfies VisitorCounts, visitorId };
});
