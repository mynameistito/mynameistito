import type { RuntimeContext } from "alchemy";
import type { DurableObjectStorageError } from "alchemy/Cloudflare";
import { DurableObject, DurableObjectState } from "alchemy/Cloudflare";
import { currentTimeMillis } from "effect/Clock";
import { fn, gen, succeed } from "effect/Effect";
import type { Effect as EffectType } from "effect/Effect";

const liveWindowMs = 2 * 60 * 1000;
const heartbeatMs = 60 * 1000;

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
      const today = new Date(now).toISOString().slice(0, 10);
      const dailyKey = `daily:${today}`;
      const seenKey = `seen:${today}:${visitorId}`;
      const liveKey = `live:${visitorId}`;

      const counts = yield* state.storage.transaction(
        gen(function* countVisitors() {
          const dailyKeys = yield* state.storage.list({ prefix: "daily:" });
          for (const key of dailyKeys.keys()) {
            if (!key.endsWith(today)) {
              yield* state.storage.delete(key);
            }
          }
          const seenKeys = yield* state.storage.list({ prefix: "seen:" });
          for (const key of seenKeys.keys()) {
            if (!key.includes(today)) {
              yield* state.storage.delete(key);
            }
          }
          const active = yield* state.storage.list<number>({ prefix: "live:" });
          for (const [key, lastSeen] of active) {
            if (now - lastSeen > liveWindowMs) {
              yield* state.storage.delete(key);
            }
          }

          const seen = yield* state.storage.get<boolean>(seenKey);
          if (!seen) {
            const current = (yield* state.storage.get<number>(dailyKey)) ?? 0;
            yield* state.storage.put(seenKey, true);
            yield* state.storage.put(dailyKey, current + 1);
          }
          yield* state.storage.put(liveKey, now);
          const activeVisitors = yield* state.storage.list<number>({
            prefix: "live:",
          });
          return {
            daily: (yield* state.storage.get<number>(dailyKey)) ?? 0,
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
      for (const [key, lastSeen] of active) {
        if (now - lastSeen > liveWindowMs) {
          yield* state.storage.delete(key);
        }
      }
      if ((yield* state.storage.list({ prefix: "live:" })).size > 0) {
        yield* state.storage.setAlarm(now + heartbeatMs);
      }
    });

    return succeed({ alarm, track });
  })
);
