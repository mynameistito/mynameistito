import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { decodeCurrentlyPlaying } from "@/lib/provider/spotify/lastfm";

describe("Last.fm Spotify activity decoding", () => {
  it("projects the current track into the homepage widget shape", async () => {
    const track = await Effect.runPromise(
      decodeCurrentlyPlaying({
        recenttracks: {
          track: [
            {
              name: "Kiwi",
              artist: { "#text": "Harry Styles" },
              album: { "#text": "Harry Styles" },
              url: "https://www.last.fm/music/Harry+Styles/_/Kiwi",
              image: [
                { "#text": "https://example.com/art.jpg", size: "large" },
              ],
              "@attr": { nowplaying: "true" },
            },
          ],
        },
      })
    );

    expect(track).toMatchObject({
      title: "Kiwi",
      artists: ["Harry Styles"],
      album: "Harry Styles",
      albumArt: "https://example.com/art.jpg",
      spotifyUrl: "https://open.spotify.com/search/Kiwi%20Harry%20Styles",
      isPlaying: true,
      progressMs: null,
      durationMs: null,
    });
  });

  it("returns null when Last.fm only has a recently played track", async () => {
    const track = await Effect.runPromise(
      decodeCurrentlyPlaying({
        recenttracks: {
          track: [
            {
              name: "Kiwi",
              artist: { "#text": "Harry Styles" },
              url: "https://www.last.fm/music/Harry+Styles/_/Kiwi",
            },
          ],
        },
      })
    );

    expect(track).toBeNull();
  });

  it("accepts Last.fm's single-track object representation", async () => {
    const track = await Effect.runPromise(
      decodeCurrentlyPlaying({
        recenttracks: {
          track: {
            name: "Kiwi",
            artist: { "#text": "Harry Styles" },
            url: "https://www.last.fm/music/Harry+Styles/_/Kiwi",
            "@attr": { nowplaying: "true" },
          },
        },
      })
    );

    expect(track?.title).toBe("Kiwi");
  });

  it("fails with a typed error for malformed recent-track data", async () => {
    const result = await Effect.runPromiseExit(
      decodeCurrentlyPlaying({ recenttracks: { track: "unknown" } })
    );

    expect(result._tag).toBe("Failure");
  });
});
