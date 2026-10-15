import { useEffect, useState } from "react";

import type { NowPlaying } from "@/lib/provider/spotify/lastfm";

const refreshIntervalMs = 30_000;

/** Shows the current Spotify item as a compact pill when available.
 * @returns A linked now-playing pill, or `null` when playback is unavailable.
 */
export const SpotifyNowPlaying = () => {
  const [track, setTrack] = useState<NowPlaying | null>(null);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const response = await fetch("/api/spotify/now-playing", {
          headers: { accept: "application/json" },
        });

        if (!response.ok) {
          return;
        }

        // SAFETY: This same-origin endpoint returns the schema-decoded NowPlaying projection.
        const nextTrack = (await response.json()) as NowPlaying | null;

        if (active) {
          setTrack(nextTrack);
        }
      } catch {
        // Keep the last successful track visible during a transient network failure.
      }
    };

    // oxlint-disable-next-line no-void -- SAFETY: refresh handles request failures internally and is intentionally fire-and-forget.
    void refresh();

    const interval = window.setInterval(() => {
      refresh();
    }, refreshIntervalMs);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (!track) {
    return null;
  }

  const artistNames = track.artists.join(", ");

  return (
    <a
      aria-label={`Listening to ${track.title} by ${artistNames} on Spotify`}
      className="flex w-fit max-w-full min-w-0 items-center gap-2 rounded-full bg-surface py-1.5 pr-3 pl-1.5 text-text transition-colors hover:bg-surface/80"
      href={track.spotifyUrl}
      rel="noreferrer"
      target="_blank"
    >
      {track.albumArt ? (
        <img
          alt=""
          className="size-8 shrink-0 rounded-full object-cover"
          height={32}
          src={track.albumArt}
          width={32}
        />
      ) : (
        <span
          aria-hidden="true"
          className="size-8 shrink-0 rounded-full bg-subtle"
        />
      )}
      <span className="min-w-0">
        <span className="block truncate text-micro leading-3 text-muted">
          Now playing
        </span>
        <span className="block truncate text-xs leading-4 font-medium">
          {track.title}{" "}
          <span className="font-normal text-muted">· {artistNames}</span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-pr-open"
      />
    </a>
  );
};
