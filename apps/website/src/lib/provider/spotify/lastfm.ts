import { Effect, Schema } from "effect";

/** A currently playing Spotify track projected from Last.fm. */
export interface NowPlaying {
  readonly title: string;
  readonly artists: readonly string[];
  readonly album: string;
  readonly albumArt: string | null;
  readonly spotifyUrl: string;
  readonly isPlaying: true;
  readonly progressMs: null;
  readonly durationMs: null;
}

/** A Last.fm request failed or returned an unexpected response. */
// oxlint-disable-next-line unicorn/throw-new-error -- SAFETY: Effect Schema.TaggedError is a class factory and must be extended without `new`.
export class LastFmError extends Schema.TaggedError<LastFmError>()(
  "LastFmError",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  }
) {}

const ImageSchema = Schema.Struct({
  "#text": Schema.String,
  size: Schema.String,
});

const TrackSchema = Schema.Struct({
  name: Schema.String,
  artist: Schema.Struct({ "#text": Schema.String }),
  album: Schema.optional(Schema.Struct({ "#text": Schema.String })),
  url: Schema.String,
  image: Schema.optional(Schema.Array(ImageSchema)),
  "@attr": Schema.optional(
    Schema.Struct({ nowplaying: Schema.optional(Schema.String) })
  ),
});

const LastFmResponseSchema = Schema.Struct({
  recenttracks: Schema.Struct({
    track: Schema.optional(
      Schema.Union([Schema.Array(TrackSchema), TrackSchema])
    ),
  }),
});

const makeLastFmError = (operation: string, cause: unknown) =>
  new LastFmError({ operation, cause });

const LastFmErrorResponseSchema = Schema.Struct({
  error: Schema.Number,
  message: Schema.String,
});

/** Parses Last.fm's recent-track response and returns only an active track.
 * @param input - Untrusted JSON returned by Last.fm.
 * @returns The current track, or `null` when Last.fm has no now-playing track.
 */
// oxlint-disable anti-slop/no-unknown-parameters -- SAFETY: The decoder parses unknown Last.fm JSON through Effect Schema before reading any fields.
export const decodeCurrentlyPlaying = Effect.fn(
  "LastFm.decodeCurrentlyPlaying"
)(function* decodeCurrentlyPlaying(input: unknown) {
  const response = yield* Schema.decodeUnknownEffect(LastFmResponseSchema)(
    input
  ).pipe(
    Effect.mapError((cause) => makeLastFmError("decode recent tracks", cause))
  );

  const tracks = response.recenttracks.track;
  const current = Array.isArray(tracks) ? tracks[0] : tracks;

  if (!current || current["@attr"]?.nowplaying !== "true") {
    return null;
  }

  const albumArt = current.image?.find(
    (image: Schema.Schema.Type<typeof ImageSchema>) => image.size === "large"
  )?.["#text"];

  const searchQuery = encodeURIComponent(
    `${current.name} ${current.artist["#text"]}`
  );

  return {
    title: current.name,
    artists: [current.artist["#text"]],
    album: current.album?.["#text"] ?? "",
    albumArt: albumArt || null,
    spotifyUrl: `https://open.spotify.com/search/${searchQuery}`,
    isPlaying: true,
    progressMs: null,
    durationMs: null,
  } satisfies NowPlaying;
});
// oxlint-enable anti-slop/no-unknown-parameters

/** Fetches the current Spotify track Last.fm reports for a user.
 * @param config - Last.fm API credentials and the linked account username.
 * @returns The active Spotify track, or `null` when no track is playing.
 */
export const currentlyPlaying = Effect.fn("LastFm.currentlyPlaying")(
  function* currentlyPlaying(config: {
    readonly apiKey: string;
    readonly username: string;
  }) {
    const url = new URL("https://ws.audioscrobbler.com/2.0/");
    url.search = new URLSearchParams({
      api_key: config.apiKey,
      format: "json",
      limit: "1",
      method: "user.getrecenttracks",
      user: config.username,
    }).toString();

    const response = yield* Effect.tryPromise({
      try: () => fetch(url, { headers: { accept: "application/json" } }),
      catch: (cause) => makeLastFmError("fetch recent tracks", cause),
    });

    if (!response.ok) {
      return yield* Effect.fail(
        makeLastFmError("fetch recent tracks", response.status)
      );
    }

    const payload = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) => makeLastFmError("read recent tracks response", cause),
    });

    const errorResponse = Schema.decodeUnknownOption(LastFmErrorResponseSchema)(
      payload
    );

    if (errorResponse._tag === "Some") {
      return yield* Effect.fail(
        makeLastFmError(
          `Last.fm API error ${errorResponse.value.error}`,
          errorResponse.value.message
        )
      );
    }

    return yield* decodeCurrentlyPlaying(payload);
  }
);
// oxlint-enable anti-slop/no-unknown-parameters
