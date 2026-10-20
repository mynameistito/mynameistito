import { createFileRoute } from "@tanstack/react-router";
import { Effect, Redacted } from "effect";

import { getAppEnv } from "@/env";
import { currentlyPlaying, LastFmError } from "@/integrations/spotify/lastfm";

const get = async () =>
  await Effect.runPromise(
    Effect.gen(function* spotifyNowPlaying() {
      const env = yield* getAppEnv();

      if (
        env.LASTFM_API_KEY === undefined ||
        env.LASTFM_USERNAME === undefined ||
        env.LASTFM_USERNAME.length === 0
      ) {
        return Response.json(null, {
          headers: { "cache-control": "no-store" },
        });
      }

      const result = yield* currentlyPlaying({
        apiKey: Redacted.value(env.LASTFM_API_KEY),
        username: env.LASTFM_USERNAME,
      }).pipe(
        Effect.catchTag("LastFmError", (error: LastFmError) =>
          Effect.succeed(error)
        )
      );

      if (result instanceof LastFmError) {
        return Response.json(
          { error: "Spotify playback is not available." },
          {
            headers: { "cache-control": "no-store" },
            status: 503,
          }
        );
      }

      return Response.json(result, {
        headers: {
          "cache-control":
            "public, max-age=5, s-maxage=10, stale-while-revalidate=20",
        },
      });
    })
  );

export const Route = createFileRoute("/api/spotify/now-playing")({
  server: { handlers: { GET: get } },
});
