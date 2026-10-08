import { Effect, Schema } from "effect";

import { getAppEnv } from "@/env";
import { VisitorCountsSchema } from "@/lib/visitor-counting";
import type { VisitorCounts } from "@/lib/visitor-counting";

/** Failure while recording a visitor or decoding the counter response. */
// oxlint-disable-next-line unicorn/throw-new-error -- SAFETY: Effect Schema.TaggedError is a class factory and must be extended without `new`.
export class VisitorCounterUnavailable extends Schema.TaggedError<VisitorCounterUnavailable>()(
  "VisitorCounterUnavailable",
  {}
) {}

/** Records a visit through the configured visitor Worker.
 * @param existingVisitorId - Valid visitor identifier from the request cookie, if present.
 * @returns The visitor identifier and parsed counts.
 */
export const recordVisitor = Effect.fn("recordVisitor")(function* recordVisitor(
  existingVisitorId?: string
) {
  const visitorId =
    existingVisitorId ?? (yield* Effect.sync(() => crypto.randomUUID()));
  const env = yield* getAppEnv();
  const visitorService = env.VISITOR_SERVICE;
  if (!visitorService) {
    return yield* new VisitorCounterUnavailable();
  }
  const response = yield* Effect.tryPromise({
    try: () =>
      visitorService.fetch(
        new Request("https://visitor-service.internal/track", {
          body: JSON.stringify({ visitorId }),
          headers: { "content-type": "application/json" },
          method: "POST",
        })
      ),
    catch: () => new VisitorCounterUnavailable(),
  });
  if (!response.ok) {
    return yield* new VisitorCounterUnavailable();
  }
  const payload = yield* Effect.tryPromise({
    try: () => response.json(),
    catch: () => new VisitorCounterUnavailable(),
  });
  const counts = yield* Schema.decodeUnknownEffect(VisitorCountsSchema)(
    payload
  ).pipe(Effect.mapError(() => new VisitorCounterUnavailable()));
  return { counts: counts satisfies VisitorCounts, visitorId };
});
