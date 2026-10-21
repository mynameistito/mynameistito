import { Data, Effect, Schema } from "effect";

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
export class LastFmError extends Data.TaggedError("LastFmError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

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

type LastFmTrack = Schema.Schema.Type<typeof TrackSchema>;

const isTrackList = (
  value: LastFmTrack | readonly LastFmTrack[]
): value is readonly LastFmTrack[] => Array.isArray(value);

const firstTrack = (
  tracks: LastFmTrack | readonly LastFmTrack[]
): LastFmTrack | undefined => {
  if (isTrackList(tracks)) {
    return tracks[0];
  }

  return tracks;
};

/** Schema for the public now-playing response returned to the browser. */
export const NowPlayingResponseSchema = Schema.Union([
  Schema.Struct({
    title: Schema.String,
    artists: Schema.Array(Schema.String),
    album: Schema.String,
    albumArt: Schema.NullOr(Schema.String),
    spotifyUrl: Schema.String,
    isPlaying: Schema.Literal(true),
    progressMs: Schema.Null,
    durationMs: Schema.Null,
  }),
  Schema.Null,
]);

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
export const decodeCurrentlyPlaying = Effect.fn(
  "LastFm.decodeCurrentlyPlaying"
)(function* decodeCurrentlyPlaying(input: Schema.Json) {
  const response = yield* Schema.decodeUnknownEffect(LastFmResponseSchema)(
    input
  ).pipe(
    Effect.mapError((cause) => makeLastFmError("decode recent tracks", cause))
  );

  const tracks = response.recenttracks.track;
  const current = tracks === undefined ? undefined : firstTrack(tracks);

  if (current === undefined || current["@attr"]?.nowplaying !== "true") {
    return null;
  }

  const albumArt = current.image?.find((image) => image.size === "large")?.[
    "#text"
  ];

  const searchQuery = encodeURIComponent(
    `${current.name} ${current.artist["#text"]}`
  );

  return {
    title: current.name,
    artists: [current.artist["#text"]],
    album: current.album?.["#text"] ?? "",
    albumArt: albumArt === "" ? null : (albumArt ?? null),
    spotifyUrl: `https://open.spotify.com/search/${searchQuery}`,
    isPlaying: true,
    progressMs: null,
    durationMs: null,
  } satisfies NowPlaying;
});

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
      try: async () =>
        await fetch(url, { headers: { accept: "application/json" } }),
      catch: (cause) => makeLastFmError("fetch recent tracks", cause),
    });

    if (!response.ok) {
      return yield* Effect.fail(
        makeLastFmError("fetch recent tracks", response.status)
      );
    }

    const payload = yield* Effect.tryPromise({
      try: async () => await response.json(),
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

    const json = yield* Schema.decodeUnknownEffect(Schema.Json)(payload).pipe(
      Effect.mapError((cause) => makeLastFmError("decode recent tracks", cause))
    );

    return yield* decodeCurrentlyPlaying(json);
  }
);
