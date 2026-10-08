import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { catch as catchEffect } from "effect/Effect";
import { decodeUnknownEffect } from "effect/Schema";

import { ContactMessageSchema } from "@/lib/contact-message";
import { sendContactMessage } from "@/server/functions/send-contact-message";

const json = (body: Record<string, string>, status: number) =>
  Response.json(body, {
    headers: { "cache-control": "no-store" },
    status,
  });

const post = ({ request }: { request: Request }) =>
  Effect.runPromise(
    Effect.gen(function* postContactMessage() {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin) {
        return json({ error: "Invalid request origin." }, 403);
      }

      const message = yield* Effect.tryPromise(() => request.json()).pipe(
        Effect.flatMap(decodeUnknownEffect(ContactMessageSchema)),
        catchEffect(() => Effect.succeed(null))
      );
      if (!message) {
        return json({ error: "Invalid message." }, 400);
      }

      const result = yield* sendContactMessage(message);
      switch (result._tag) {
        case "Sent": {
          return json({ sent: "true" }, 200);
        }
        case "NotConfigured": {
          const detail =
            import.meta.env.DEV && result.missing.length > 0
              ? ` Missing: ${result.missing.join(", ")}.`
              : "";
          return json(
            { error: `Contact form is not configured.${detail}` },
            503
          );
        }
        case "DeliveryFailed": {
          return json({ error: "Unable to send this message." }, 502);
        }
        default: {
          return json({ error: "Unable to send this message." }, 502);
        }
      }
    })
  );

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: post,
    },
  },
});
