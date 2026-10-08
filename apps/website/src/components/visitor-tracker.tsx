import { useRouterState } from "@tanstack/react-router";
import {
  decodeUnknownSync,
  Number as SchemaNumber,
  Struct,
} from "effect/Schema";
import { useEffect, useState } from "react";

interface VisitorCounts {
  readonly daily: number;
  readonly live: number;
}

const heartbeatIntervalMs = 30 * 1000;
const VisitorCountsSchema = Struct({
  daily: SchemaNumber,
  live: SchemaNumber,
});

/** Tracks live sessions site-wide; renders the badge only on the home route.
 * @returns The visitor counter status badge on the home route.
 */
export const VisitorTracker = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [counts, setCounts] = useState<VisitorCounts>();

  useEffect(() => {
    let cancelled = false;
    const heartbeat = async () => {
      try {
        const response = await fetch("/api/visitors", {
          body: JSON.stringify({ path: pathname }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        if (!response.ok) {
          return;
        }
        let value: VisitorCounts;
        try {
          value = decodeUnknownSync(VisitorCountsSchema)(await response.json());
        } catch {
          return;
        }
        if (!cancelled) {
          setCounts(value);
        }
      } catch {
        // The portfolio remains usable if the optional visitor count is down.
      }
    };

    void heartbeat();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void heartbeat();
      }
    }, heartbeatIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

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
