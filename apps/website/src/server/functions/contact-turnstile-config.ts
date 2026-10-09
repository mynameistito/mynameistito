import { createServerFn } from "@tanstack/react-start";
import { Effect, Option } from "effect";

import { getAppEnv } from "@/env";

/** Loads the public Turnstile sitekey for rendering the contact form widget. */
export const getContactTurnstileSitekey = createServerFn({
  method: "GET",
}).handler(() =>
  Effect.runPromise(
    Effect.gen(function* loadSitekey() {
      const loadedEnv = yield* getAppEnv().pipe(Effect.option);
      if (Option.isNone(loadedEnv)) {
        return null;
      }
      return loadedEnv.value.TURNSTILE_SITEKEY ?? null;
    })
  )
);
