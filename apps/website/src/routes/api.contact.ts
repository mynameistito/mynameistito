import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { catch as catchEffect } from "effect/Effect";
import { decodeUnknownEffect } from "effect/Schema";

import { ContactSubmissionSchema } from "@/lib/contact-message";
import { sendContactMessage } from "@/server/functions/send-contact-message";
import { verifyConfiguredTurnstile } from "@/server/functions/turnstile";

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

      const submission = yield* Effect.tryPromise(() => request.json()).pipe(
        Effect.flatMap(decodeUnknownEffect(ContactSubmissionSchema)),
        catchEffect(() => Effect.succeed(null))
      );
      if (!submission) {
        return json({ error: "Invalid message." }, 400);
      }

      const token = submission.turnstileToken;
      const verified = yield* verifyConfiguredTurnstile({
        token,
        expectedHostname: new URL(request.url).hostname,
        expectedAction: "contact",
        remoteIp: request.headers.get("cf-connecting-ip") ?? "",
      });
      if (!verified) {
        return json({ error: "Forbidden." }, 403);
      }

      const result = yield* sendContactMessage(submission.message);
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
