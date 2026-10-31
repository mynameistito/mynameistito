import { useRouterState } from "@tanstack/react-router";
import { Effect } from "effect";
import { UsersRound } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";

import { loadVisitorCounts } from "@/features/visitors/client";
import type { VisitorCounts } from "@/features/visitors/counting";
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
    const sitekey = turnstileSitekey;

    const shouldTrack =
      sitekey !== null &&
      sitekey !== undefined &&
      pathname !== "/blog" &&
      !pathname.startsWith("/blog/");

    let cancelled = false;

    const heartbeatGuard = { active: false };

    const trackHeartbeat = async () => {
      if (sitekey === undefined || sitekey === null) {
        return;
      }

      const value = await runWithHeartbeatGuard(
        heartbeatGuard,
        async () =>
          await Effect.runPromise(loadVisitorCounts(pathname, sitekey))
      );

      if (!cancelled && value) {
        setCounts(value satisfies VisitorCounts);
      }
    };

    const interval = shouldTrack
      ? window.setInterval(() => {
          if (document.visibilityState === "visible") {
            void trackHeartbeat();
          }
        }, heartbeatIntervalMs)
      : undefined;

    if (shouldTrack) {
      void trackHeartbeat();
    }

    return () => {
      cancelled = true;

      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, [pathname, turnstileSitekey]);

  return (
    <VisitorCountsContext.Provider value={counts}>
      {children}
    </VisitorCountsContext.Provider>
  );
};

/** Shows live, daily, and lifetime visitor counts in an expandable panel.
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
        onClick={() => {
          setIsOpen((open) => !open);
        }}
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
