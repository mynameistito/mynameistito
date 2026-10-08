import { DurableObject } from "cloudflare:workers";
import { Effect } from "effect";
import { currentTimeMillis } from "effect/Clock";
import { catch as catchEffect } from "effect/Effect";
import {
  check,
  decodeUnknownEffect,
  isPattern,
  String as SchemaString,
  Struct,
} from "effect/Schema";

import {
  dailyCountAfterVisit,
  expiredLiveVisitorKeys,
  expiredVisitorKeys,
  heartbeatMs,
  keysForVisitor,
} from "@/lib/visitor-counting";

interface Env {
  readonly VISITOR_COUNTER: DurableObjectNamespace<VisitorCounter>;
}

interface VisitorCounts {
  readonly daily: number;
  readonly live: number;
}

const VisitorRequest = Struct({
  visitorId: SchemaString.pipe(check(isPattern(/^[\da-f-]{36}$/iu))),
});
type VisitorInput = typeof VisitorRequest.Type;

const readVisitorRequest = (request: Request) =>
  Effect.tryPromise(() => request.json()).pipe(
    Effect.flatMap(decodeUnknownEffect(VisitorRequest)),
    catchEffect(() => Effect.succeed(null))
  );

/** Local Cloudflare Worker that hosts the local visitor Durable Object. */
export default {
  fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return Promise.resolve(new Response(null, { status: 405 }));
    }

    return Effect.runPromise(
      Effect.gen(function* handleLocalRequest() {
        const input = yield* readVisitorRequest(request);
        if (!input) {
          return Response.json({ error: "Invalid visitor." }, { status: 400 });
        }
        const counter = env.VISITOR_COUNTER.get(
          env.VISITOR_COUNTER.idFromName("site")
        );
        return yield* Effect.tryPromise(() =>
          counter.fetch(
            new Request("https://visitor-counter.local/track", {
              body: JSON.stringify(input),
              headers: { "content-type": "application/json" },
              method: "POST",
            })
          )
        );
      })
    );
  },
};

/** Cloudflare Durable Object used by local development. */
export class VisitorCounter extends DurableObject<Env> {
  /**
   * Track a visitor and return current daily and live counts.
   * @param request - The tracking request.
   * @returns The current daily and live counts.
   */
  fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Promise.resolve(new Response(null, { status: 405 }));
    }

    const { storage } = this.ctx;
    const countVisitor = (timestamp: number, input: VisitorInput) => {
      const keys = keysForVisitor(timestamp, input.visitorId);
      return storage.transaction(async (storageTransaction) => {
        const dailyKeys = await storageTransaction.list({ prefix: "daily:" });
        const seenKeys = await storageTransaction.list({ prefix: "seen:" });
        const active = await storageTransaction.list<number>({
          prefix: "live:",
        });
        const expired = expiredVisitorKeys({
          today: keys.today,
          now: timestamp,
          dailyKeys: dailyKeys.keys(),
          seenKeys: seenKeys.keys(),
          liveEntries: active,
        });
        await Promise.all(expired.map((key) => storageTransaction.delete(key)));
        const seen = await storageTransaction.get<boolean>(keys.seen);
        const daily = (await storageTransaction.get<number>(keys.daily)) ?? 0;
        await storageTransaction.put(keys.seen, true);
        await storageTransaction.put(
          keys.daily,
          dailyCountAfterVisit(daily, seen ?? false)
        );
        await storageTransaction.put(keys.live, timestamp);
        const live = await storageTransaction.list({ prefix: "live:" });
        return {
          daily: (await storageTransaction.get<number>(keys.daily)) ?? 0,
          live: live.size,
        } satisfies VisitorCounts;
      });
    };
    return Effect.runPromise(
      Effect.gen(function* trackLocalVisitor() {
        const input = yield* readVisitorRequest(request);
        if (!input) {
          return Response.json({ error: "Invalid visitor." }, { status: 400 });
        }
        const timestamp = yield* currentTimeMillis;
        const counts = yield* Effect.tryPromise(() =>
          countVisitor(timestamp, input)
        );
        yield* Effect.tryPromise(() =>
          storage.setAlarm(timestamp + heartbeatMs)
        );
        return Response.json(counts, {
          headers: { "cache-control": "no-store" },
        });
      })
    );
  }

  /**
   * Remove expired live visitors when the Durable Object alarm fires.
   * @returns Nothing.
   */
  alarm(): Promise<void> {
    const { storage } = this.ctx;
    return Effect.runPromise(
      Effect.gen(function* cleanLocalVisitors() {
        const timestamp = yield* currentTimeMillis;
        const active = yield* Effect.tryPromise(() =>
          storage.list<number>({ prefix: "live:" })
        );
        const expired = expiredLiveVisitorKeys(active, timestamp);
        for (const key of expired) {
          yield* Effect.tryPromise(() => storage.delete(key));
        }
        const remaining = yield* Effect.tryPromise(() =>
          storage.list({ prefix: "live:" })
        );
        if (remaining.size > 0) {
          yield* Effect.tryPromise(() =>
            storage.setAlarm(timestamp + heartbeatMs)
          );
        }
      })
    );
  }
}
