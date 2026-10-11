import { useRouterState } from "@tanstack/react-router";
import { Effect } from "effect";
import { catch as catchEffect } from "effect/Effect";
import { decodeUnknownEffect } from "effect/Schema";
import { UsersRound } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";

import { getTurnstileToken } from "@/lib/turnstile-client";
import { VisitorCountsSchema } from "@/lib/visitor-counting";
import type { VisitorCounts } from "@/lib/visitor-counting";
import { getTurnstileSitekey } from "@/server/functions/contact-turnstile-config";

const VisitorCountsContext = createContext<VisitorCounts | undefined>(
  undefined
);

const heartbeatIntervalMs = 30 * 1000;
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

/** Tracks live sessions site-wide and shares counts with the profile UI.
 * @param props - The application subtree that can display visitor activity.
 * @returns The visitor counter context provider.
 */
export const VisitorTracker = ({ children }: { children: React.ReactNode }) => {
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

  return (
    <VisitorCountsContext.Provider value={counts}>
      {children}
    </VisitorCountsContext.Provider>
  );
};

/** Shows today's unique visitors and expands to the current live count.
 * @returns The compact visitor activity disclosure.
 */
export const VisitorActivity = () => {
  const counts = useContext(VisitorCountsContext);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-fit">
      <button
        aria-controls="visitor-activity-details"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide visitor activity" : "View visitor activity"}
        className="grid size-[30px] place-items-center rounded-control border border-line bg-surface text-muted transition-colors hover:text-text active:translate-y-px"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <UsersRound aria-hidden="true" size={15} />
      </button>
      {isOpen && (
        <div
          className="absolute top-full right-0 z-10 mt-2 min-w-48 rounded-2xl border border-line bg-surface p-4 shadow-lg"
          id="visitor-activity-details"
        >
          <p className="m-0 text-xs font-medium text-text">Visitor activity</p>
          <p className="mt-2 mb-0 flex items-center justify-between gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-accent"
              />
              Here now
            </span>
            <span className="font-medium text-text">
              {counts ? counts.live.toLocaleString() : "—"}
            </span>
          </p>
          <p className="mt-1 mb-0 flex items-center justify-between gap-4 text-xs text-muted">
            <span>Joined today</span>
            <span className="font-medium text-text">
              {counts ? counts.daily.toLocaleString() : "—"}
            </span>
          </p>
          <p className="mt-1 mb-0 flex items-center justify-between gap-4 text-xs text-muted">
            <span>Total visitors</span>
            <span className="font-medium text-text">
              {counts ? counts.total.toLocaleString() : "—"}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
