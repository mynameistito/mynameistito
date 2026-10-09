import { Effect, Option, Redacted, Schema } from "effect";
import { decodeUnknownEffect } from "effect/Schema";

const SiteverifyResponseSchema = Schema.Struct({
  success: Schema.Boolean,
  action: Schema.optional(Schema.String),
  hostname: Schema.optional(Schema.String),
});

/** Inputs needed to verify a Turnstile response. */
export interface VerifyTurnstileInput {
  readonly token: string;
  readonly secret: Redacted.Redacted<string>;
  readonly expectedHostname: string;
  readonly expectedAction: string;
  readonly remoteIp?: string;
}

/**
 * Verify a one-use token with Cloudflare and fail closed on any
 * transport, response-decoding, action, or hostname mismatch.
 *
 * @param input - The token, redacted widget secret, and request host context.
 * @returns An Effect that succeeds with whether Cloudflare accepted the token.
 */
export const verifyTurnstile = Effect.fn("Turnstile.verify")(
  function* verifyTurnstile(input: VerifyTurnstileInput) {
    if (
      input.token.length === 0 ||
      input.token.length > 2048 ||
      input.expectedHostname.length === 0
    ) {
      return false;
    }

    const body = new URLSearchParams({
      response: input.token,
      secret: Redacted.value(input.secret),
    });
    if (input.remoteIp) {
      body.set("remoteip", input.remoteIp);
    }

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
          signal: AbortSignal.timeout(10_000),
        }),
      catch: () => new Error("Turnstile Siteverify request failed"),
    }).pipe(Effect.option);
    if (Option.isNone(response) || !response.value.ok) {
      return false;
    }

    const responseBody = yield* Effect.tryPromise({
      try: () => response.value.json(),
      catch: () => new Error("Turnstile Siteverify response was not JSON"),
    }).pipe(Effect.option);
    if (Option.isNone(responseBody)) {
      return false;
    }

    const result = yield* decodeUnknownEffect(SiteverifyResponseSchema)(
      responseBody.value
    ).pipe(Effect.option);
    if (Option.isNone(result)) {
      return false;
    }

    return (
      result.value.success &&
      result.value.action === input.expectedAction &&
      result.value.hostname === input.expectedHostname
    );
  }
);
