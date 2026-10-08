import type { RuntimeContext } from "alchemy";
import { Worker } from "alchemy/Cloudflare";
// eslint-disable-next-line anti-slop/no-shape-in-symbol-names -- Alchemy's exported WorkerShape type is the platform contract.
import type { WorkerShape as WorkerContract } from "alchemy/Cloudflare";
import {
  catch as catchEffect,
  catchTag,
  gen,
  provide,
  succeed,
} from "effect/Effect";
import { HttpServerRequest } from "effect/http/HttpServerRequest";
import { empty, json } from "effect/http/HttpServerResponse";
import {
  check,
  decodeUnknownEffect,
  isPattern,
  String as SchemaString,
  Struct,
} from "effect/Schema";

import VisitorCounterLive, { VisitorCounter } from "./lib/visitor-counter";

const VisitRequest = Struct({
  visitorId: SchemaString.pipe(check(isPattern(/^[\da-f-]{36}$/iu))),
});

type VisitorWorkerContract = WorkerContract<RuntimeContext>;

/** Effect-native Worker host for the persistent visitor Durable Object. */
export class VisitorService extends Worker<
  VisitorService,
  VisitorWorkerContract,
  VisitorCounter
>()("VisitorService") {}

export default VisitorService.make(
  { main: import.meta.url, workersDev: { enabled: false } },
  gen(function* makeVisitorService() {
    const counters = yield* VisitorCounter.from(VisitorService);

    return {
      fetch: gen(function* fetch() {
        const request = yield* HttpServerRequest;
        if (request.method !== "POST") {
          return empty({ status: 405 });
        }

        const body = yield* request.json.pipe(catchEffect(() => succeed(null)));
        const input = yield* decodeUnknownEffect(VisitRequest)(body).pipe(
          catchEffect(() => succeed(null))
        );
        if (!input) {
          return yield* json({ error: "Invalid visitor." }, { status: 400 });
        }

        return yield* gen(function* returnVisitorCounts() {
          const counts = yield* counters
            .getByName("site")
            .track(input.visitorId);
          return yield* json(counts, {
            headers: { "cache-control": "no-store" },
          });
        }).pipe(
          catchTag("DurableObjectStorageError", () =>
            json({ error: "Visitor count unavailable." }, { status: 503 })
          )
        );
      }),
    };
  }).pipe(provide(VisitorCounterLive))
);
