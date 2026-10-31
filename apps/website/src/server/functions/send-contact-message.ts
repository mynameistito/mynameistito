import {
  createEmail,
  fromApiKey,
  ResendProtocol,
} from "@distilled.cloud/resend";
import { Effect, Option } from "effect";
import { layer as fetchHttpClientLayer } from "effect/http/FetchHttpClient";
import { mergeAll } from "effect/Layer";

import { getAppEnv } from "@/env";
import type { ContactMessage } from "@/features/contact/message";

/** Delivers a parsed contact message through the configured email provider.
 * @param message - The validated contact form values.
 * @returns The delivery outcome for the HTTP adapter.
 */
export const sendContactMessage = Effect.fn("sendContactMessage")(
  function* sendContactMessage(message: ContactMessage) {
    if (message.company.length > 0) {
      return { _tag: "Sent" } as const;
    }

    const loadedEnv = yield* getAppEnv().pipe(Effect.option);

    if (Option.isNone(loadedEnv)) {
      return { _tag: "NotConfigured", missing: [] } as const;
    }

    const env = loadedEnv.value;
    const { RESEND_API_KEY, CONTACT_RECIPIENT, RESEND_FROM } = env;

    const missing: string[] = [];

    if (RESEND_API_KEY === undefined) {
      missing.push("RESEND_API_KEY");
    }

    if (CONTACT_RECIPIENT === undefined || CONTACT_RECIPIENT.length === 0) {
      missing.push("CONTACT_RECIPIENT");
    }

    if (RESEND_FROM === undefined || RESEND_FROM.length === 0) {
      missing.push("RESEND_FROM");
    }

    if (missing.length > 0) {
      return { _tag: "NotConfigured", missing } as const;
    }

    if (RESEND_API_KEY === undefined) {
      return { _tag: "NotConfigured", missing: [] } as const;
    }

    if (CONTACT_RECIPIENT === undefined || CONTACT_RECIPIENT.length === 0) {
      return { _tag: "NotConfigured", missing: [] } as const;
    }

    if (RESEND_FROM === undefined || RESEND_FROM.length === 0) {
      return { _tag: "NotConfigured", missing: [] } as const;
    }

    const email = createEmail({
      from: RESEND_FROM,
      reply_to: message.email,
      subject: `Website message from ${message.name}`,
      text: `${message.message}\n\n— ${message.name} <${message.email}>`,
      to: CONTACT_RECIPIENT,
    });

    const services = mergeAll(
      fetchHttpClientLayer,
      fromApiKey({ apiKey: RESEND_API_KEY }),
      ResendProtocol
    );

    const sent = yield* Effect.match(Effect.provide(email, services), {
      onFailure: (error) => {
        console.error("Contact email delivery failed.", error);

        return false;
      },
      onSuccess: () => true,
    });

    return sent
      ? ({ _tag: "Sent" } as const)
      : ({ _tag: "DeliveryFailed" } as const);
  }
);
