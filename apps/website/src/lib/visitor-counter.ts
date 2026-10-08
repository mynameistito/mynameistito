import type { RuntimeContext } from "alchemy";
import type { DurableObjectStorageError } from "alchemy/Cloudflare";
import { DurableObject, DurableObjectState } from "alchemy/Cloudflare";
import { currentTimeMillis } from "effect/Clock";
import { fn, gen, succeed } from "effect/Effect";
import type { Effect as EffectType } from "effect/Effect";

import {
  dailyCountAfterVisit,
  expiredVisitorKeys,
  expiredLiveVisitorKeys,
  heartbeatMs,
  keysForVisitor,
} from "./visitor-counting";

/** Daily unique and currently active visitor counts. */
interface VisitorCounts {
  readonly daily: number;
  readonly live: number;
}

/** Public Effect operations exposed by the visitor Durable Object. */
export interface VisitorCounterMethods {
  readonly track: (
    visitorId: string
  ) => EffectType<VisitorCounts, DurableObjectStorageError, RuntimeContext>;
  readonly alarm: () => EffectType<
    void,
    DurableObjectStorageError,
    RuntimeContext
  >;
}

/** The typed Alchemy Durable Object namespace for portfolio visitor state. */
export class VisitorCounter extends DurableObject<
  VisitorCounter,
  VisitorCounterMethods
>()("VisitorCounter") {}

export default VisitorCounter.make(
  gen(function* makeVisitorCounter() {
    const state = yield* DurableObjectState;

    const track = fn("VisitorCounter.track")(function* trackVisitor(
      visitorId: string
    ) {
      const now = yield* currentTimeMillis;
      const keys = keysForVisitor(now, visitorId);

      const counts = yield* state.storage.transaction(
        gen(function* countVisitors() {
          const dailyKeys = yield* state.storage.list({ prefix: "daily:" });
          const seenKeys = yield* state.storage.list({ prefix: "seen:" });
          const active = yield* state.storage.list<number>({ prefix: "live:" });
          const expired = expiredVisitorKeys({
            today: keys.today,
            now,
            dailyKeys: dailyKeys.keys(),
            seenKeys: seenKeys.keys(),
            liveEntries: active,
          });
          for (const key of expired) {
            yield* state.storage.delete(key);
          }

          const seen = yield* state.storage.get<boolean>(keys.seen);
          const current = (yield* state.storage.get<number>(keys.daily)) ?? 0;
          if (!seen) {
            yield* state.storage.put(keys.seen, true);
          }
          yield* state.storage.put(
            keys.daily,
            dailyCountAfterVisit(current, seen ?? false)
          );
          yield* state.storage.put(keys.live, now);
          const activeVisitors = yield* state.storage.list<number>({
            prefix: "live:",
          });
          return {
            daily: (yield* state.storage.get<number>(keys.daily)) ?? 0,
            live: activeVisitors.size,
          } satisfies VisitorCounts;
        })
      );

      yield* state.storage.setAlarm(now + heartbeatMs);
      return counts;
    });

    const alarm = fn("VisitorCounter.alarm")(function* cleanLiveVisitors() {
      const now = yield* currentTimeMillis;
      const active = yield* state.storage.list<number>({ prefix: "live:" });
      const expired = expiredLiveVisitorKeys(active, now);
      for (const key of expired) {
        yield* state.storage.delete(key);
      }
      if ((yield* state.storage.list({ prefix: "live:" })).size > 0) {
        yield* state.storage.setAlarm(now + heartbeatMs);
      }
    });

    return succeed({ alarm, track });
  })
);
