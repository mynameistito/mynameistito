import { Option, Schema } from "effect";

import { NowPlayingResponseSchema } from "@/integrations/spotify/lastfm";
import type { NowPlaying } from "@/integrations/spotify/lastfm";

/** Fetch and parse the same-origin now-playing response.
 * @returns The current track, or `null` when playback is unavailable.
 */
export const fetchNowPlaying = async (): Promise<NowPlaying | null> => {
  const response = await fetch("/api/spotify/now-playing", {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Now-playing request failed.");
  }

  const payload: unknown = await response.json();
  const decoded = Schema.decodeUnknownOption(NowPlayingResponseSchema)(payload);

  if (Option.isNone(decoded)) {
    throw new Error("The now-playing response was invalid.");
  }

  return decoded.value;
};
