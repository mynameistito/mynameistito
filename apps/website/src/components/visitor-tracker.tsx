import { useRouterState } from "@tanstack/react-router";
import { Effect } from "effect";
import { catch as catchEffect } from "effect/Effect";
import {
  decodeUnknownEffect,
  Number as SchemaNumber,
  Struct,
} from "effect/Schema";
import { useEffect, useState } from "react";

import { getTurnstileToken } from "@/lib/turnstile-client";
import { getTurnstileSitekey } from "@/server/functions/contact-turnstile-config";

interface VisitorCounts {
  readonly daily: number;
  readonly live: number;
}

const heartbeatIntervalMs = 30 * 1000;
const VisitorCountsSchema = Struct({
  daily: SchemaNumber,
  live: SchemaNumber,
});
const runWithHeartbeatGuard = async <A,>(
  guard: { active: boolean },
  task: () => Promise<A>
): Promise<A | null> => {
  if (guard.active) {
    return null;
  }
  guard.active = true;
  try {
    return await task();
  } catch {
    return null;
  } finally {
    guard.active = false;
  }
};

const loadVisitorCounts = (pathname: string, sitekey: string) =>
  Effect.gen(function* loadVisitorCountsProgram() {
    const token = yield* Effect.tryPromise(() =>
      getTurnstileToken(sitekey, "visitor")
    );
    const response = yield* Effect.tryPromise(() =>
      fetch("/api/visitors", {
        body: JSON.stringify({ path: pathname, turnstileToken: token }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
    if (!response.ok) {
      return null;
    }
    const payload = yield* Effect.tryPromise(() => response.json());
    return yield* decodeUnknownEffect(VisitorCountsSchema)(payload);
  }).pipe(catchEffect(() => Effect.succeed(null)));

/** Tracks live sessions site-wide; renders the badge only on the home route.
 * @returns The visitor counter status badge on the home route.
 */
export const VisitorTracker = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [counts, setCounts] = useState<VisitorCounts>();
  const [turnstileSitekey, setTurnstileSitekey] = useState<
    string | null | undefined
  >();
  useEffect(() => {
    let cancelled = false;
    const loadSitekey = async () => {
      try {
        const sitekey = await getTurnstileSitekey();
        if (!cancelled) {
          setTurnstileSitekey(sitekey);
        }
      } catch {
        if (!cancelled) {
          setTurnstileSitekey(null);
        }
      }
    };
    void loadSitekey();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!turnstileSitekey) {
      return;
    }
    let cancelled = false;
    const heartbeatGuard = { active: false };
    const trackHeartbeat = async () => {
      const value = await runWithHeartbeatGuard(heartbeatGuard, () =>
        Effect.runPromise(loadVisitorCounts(pathname, turnstileSitekey))
      );
      if (!cancelled && value) {
        setCounts(value satisfies VisitorCounts);
      }
    };

    void trackHeartbeat();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void trackHeartbeat();
      }
    }, heartbeatIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname, turnstileSitekey]);

  if (pathname !== "/") {
    return null;
  }
  return (
    <output
      aria-label="Visitor activity"
      className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-subtle"
    >
      <span>
        {counts
          ? `${counts.daily.toLocaleString()} today`
          : "Visitor count loading"}
      </span>
      {counts && <span>{counts.live.toLocaleString()} here now</span>}
    </output>
  );
};
