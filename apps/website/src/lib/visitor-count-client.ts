import { Effect } from "effect";
import { catch as catchEffect } from "effect/Effect";
import { decodeUnknownEffect } from "effect/Schema";

import { getTurnstileToken } from "@/lib/turnstile-client";
import { VisitorCountsSchema } from "@/lib/visitor-counting";

/** Verify and submit a visitor heartbeat, then parse the returned counts.
 * @param pathname - The current public route.
 * @param sitekey - The public Turnstile sitekey.
 * @returns Validated visitor counts, or `null` when verification or the request fails.
 */
export const loadVisitorCounts = (pathname: string, sitekey: string) =>
  Effect.gen(function* loadVisitorCountsProgram() {
    const token = yield* Effect.tryPromise(
      async () => await getTurnstileToken(sitekey, "visitor")
    );

    const response = yield* Effect.tryPromise(
      async () =>
        await fetch("/api/visitors", {
          body: JSON.stringify({ path: pathname, turnstileToken: token }),
          headers: { "content-type": "application/json" },
          method: "POST",
        })
    );

    if (!response.ok) {
      return null;
    }

    const payload = yield* Effect.tryPromise(async () => await response.json());

    return yield* decodeUnknownEffect(VisitorCountsSchema)(payload);
  }).pipe(catchEffect(() => Effect.succeed(null)));
