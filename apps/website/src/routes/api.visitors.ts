import { createFileRoute } from "@tanstack/react-router";
import { catch as catchEffect, runPromise, succeed } from "effect/Effect";
import {
  check,
  decodeUnknownEffect,
  isPattern,
  String as SchemaString,
  Struct,
} from "effect/Schema";

import { getAppEnv } from "@/env";

const VisitorRequest = Struct({
  path: SchemaString.pipe(
    check(
      isPattern(
        /^\/(?:about|contact|links|open-source|projects(?:\/[a-z0-9-]+)?)?$/u
      )
    )
  ),
});

const post = async ({ request }: { request: Request }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const decoded = await runPromise(
    decodeUnknownEffect(VisitorRequest)(payload).pipe(
      catchEffect(() => succeed(null))
    )
  );
  if (!decoded) {
    return Response.json({ error: "Invalid route." }, { status: 400 });
  }

  const cookie = request.headers.get("cookie") ?? "";
  const existingId = cookie.match(
    /(?:^|;\s*)site_visitor=(?<visitorId>[\da-f-]{36})/iu
  )?.groups?.visitorId;
  const visitorId = existingId ?? crypto.randomUUID();
  const { VISITOR_SERVICE } = await getAppEnv();
  if (!VISITOR_SERVICE) {
    return Response.json(
      { error: "Visitor counts are unavailable in local development." },
      { status: 503 }
    );
  }
  const response = await VISITOR_SERVICE.fetch(
    new Request("https://visitor-service.internal/track", {
      body: JSON.stringify({ visitorId }),
      headers: { "content-type": "application/json" },
      method: "POST",
    })
  );
  const counts = await response.json();
  return Response.json(counts, {
    headers: {
      "cache-control": "no-store",
      "set-cookie": `site_visitor=${visitorId}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
    },
    status: response.status,
  });
};

export const Route = createFileRoute("/api/visitors")({
  server: {
    handlers: {
      POST: post,
    },
  },
});
