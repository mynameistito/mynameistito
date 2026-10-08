import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { catch as catchEffect } from "effect/Effect";
import {
  check,
  decodeUnknownEffect,
  isPattern,
  String as SchemaString,
  Struct,
} from "effect/Schema";

import { recordVisitor } from "@/server/functions/record-visitor";

const VisitorRequest = Struct({
  path: SchemaString.pipe(
    check(
      isPattern(
        /^\/(?:about|contact|links|open-source|projects(?:\/[a-z0-9-]+)?)?$/u
      )
    )
  ),
});
const visitorUnavailableMessage = "Visitor counts are unavailable.";

const post = ({ request }: { request: Request }) =>
  Effect.runPromise(
    Effect.gen(function* trackVisitor() {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin) {
        return Response.json(
          { error: "Invalid request origin." },
          { status: 403 }
        );
      }

      const decoded = yield* Effect.tryPromise(() => request.json()).pipe(
        Effect.flatMap(decodeUnknownEffect(VisitorRequest)),
        catchEffect(() => Effect.succeed(null))
      );
      if (!decoded) {
        return Response.json({ error: "Invalid route." }, { status: 400 });
      }

      const cookie = request.headers.get("cookie") ?? "";
      const existingId = cookie.match(
        /(?:^|;\s*)site_visitor=(?<visitorId>[\da-f-]{36})/iu
      )?.groups?.visitorId;
      const recorded = yield* recordVisitor(existingId);
      if (!recorded) {
        return Response.json(
          { error: visitorUnavailableMessage },
          { status: 503 }
        );
      }
      return Response.json(recorded.counts, {
        headers: {
          "cache-control": "no-store",
          "set-cookie": `site_visitor=${recorded.visitorId}; Path=/; Max-Age=31536000; HttpOnly${new URL(request.url).protocol === "https:" ? "; Secure" : ""}; SameSite=Lax`,
        },
        status: 200,
      });
    })
  );

export const Route = createFileRoute("/api/visitors")({
  server: {
    handlers: {
      POST: post,
    },
  },
});
