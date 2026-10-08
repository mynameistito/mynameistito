import {
  createEmail,
  fromApiKey,
  ResendProtocol,
} from "@distilled.cloud/resend";
import { createFileRoute } from "@tanstack/react-router";
import {
  catch as catchEffect,
  provide,
  runPromise,
  succeed,
} from "effect/Effect";
import { layer as fetchHttpClientLayer } from "effect/http/FetchHttpClient";
import { mergeAll } from "effect/Layer";
import {
  check,
  decodeUnknownEffect,
  isMaxLength,
  isMinLength,
  isPattern,
  String as SchemaString,
  Struct,
} from "effect/Schema";

import { getAppEnv } from "@/env";

const ContactMessage = Struct({
  name: SchemaString.pipe(check(isMinLength(1), isMaxLength(120))),
  email: SchemaString.pipe(
    check(
      isMaxLength(254),
      isPattern(/^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,63}$/u)
    )
  ),
  message: SchemaString.pipe(check(isMinLength(1), isMaxLength(5000))),
  company: SchemaString,
});

const json = (body: Record<string, string>, status: number) =>
  Response.json(body, {
    headers: { "cache-control": "no-store" },
    status,
  });

const post = async ({ request }: { request: Request }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: "Invalid request origin." }, 403);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid message." }, 400);
  }
  const message = await runPromise(
    decodeUnknownEffect(ContactMessage)(payload).pipe(
      catchEffect(() => succeed(null))
    )
  );
  if (!message) {
    return json({ error: "Invalid message." }, 400);
  }
  if (message.company) {
    return json({ sent: "true" }, 200);
  }
  const env = await getAppEnv();
  if (!env.RESEND_API_KEY || !env.CONTACT_RECIPIENT || !env.RESEND_FROM) {
    return json({ error: "Contact form is not configured." }, 503);
  }

  const program = createEmail({
    from: env.RESEND_FROM,
    reply_to: message.email,
    subject: `Website message from ${message.name}`,
    text: `${message.message}\n\n— ${message.name} <${message.email}>`,
    to: env.CONTACT_RECIPIENT,
  });
  const services = mergeAll(
    fetchHttpClientLayer,
    fromApiKey({ apiKey: env.RESEND_API_KEY }),
    ResendProtocol
  );

  try {
    await runPromise(provide(program, services));
    return json({ sent: "true" }, 200);
  } catch {
    return json({ error: "Unable to send this message." }, 502);
  }
};

export const Route = createFileRoute("/api/contact")({
  server: {
    handlers: {
      POST: post,
    },
  },
});
