import { DateTime, Effect, Layer, Redacted } from "effect";

import { getAppEnv } from "@/env";
import { profile } from "@/lib/profile";
import { GitHub } from "@/lib/provider/github/client";
import type { Profile as GitHubProfile } from "@/lib/provider/github/client";
import { MDFromX } from "@/lib/provider/mdfromx/profile";
import type { Profile as XProfile } from "@/lib/provider/mdfromx/profile";

const cacheDuration = 30 * 60 * 1000;

/** Profile data consumed by the social footer previews. */
export interface SocialProfileData {
  readonly github: GitHubProfile | null;
  readonly x: XProfile | null;
}

let cachedData: SocialProfileData | undefined;
let cachedAt = 0;

const loadFromProviders = (env: Awaited<ReturnType<typeof getAppEnv>>) =>
  Effect.gen(function* loadSocialProfileProgram() {
    const github = yield* GitHub;
    const mdfromx = yield* MDFromX;
    const now = yield* DateTime.now;
    const endDate = DateTime.formatIso(now);
    const startDate = DateTime.formatIso(
      now.pipe(DateTime.subtract({ years: 1 }))
    );

    const [githubProfile, xProfile] = yield* Effect.all(
      [
        github
          .profile(profile.github, startDate, endDate)
          .pipe(
            Effect.catchTag("GitHubRequestError", () =>
              Effect.succeed(cachedData?.github ?? null)
            )
          ),
        mdfromx
          .profile(profile.x)
          .pipe(
            Effect.catchTag("MDFromXRequestError", () =>
              Effect.succeed(cachedData?.x ?? null)
            )
          ),
      ],
      { concurrency: "unbounded" }
    );

    const nextData: SocialProfileData = {
      github: githubProfile,
      x: xProfile,
    };
    if (nextData.github || nextData.x) {
      cachedData = nextData;
      cachedAt = now.epochMilliseconds;
    }
    return nextData;
  }).pipe(
    Effect.provide(
      Layer.merge(
        GitHub.layer({
          username: profile.github,
          token: env.GITHUB_TOKEN ? Redacted.make(env.GITHUB_TOKEN) : undefined,
        }),
        MDFromX.layer(
          env.MDFROMX_API_KEY ? Redacted.make(env.MDFROMX_API_KEY) : undefined
        )
      )
    )
  );

/** Loads cached public GitHub and X profile details. */
export const loadSocialProfiles = Effect.fn("loadSocialProfiles")(
  function* loadSocialProfiles() {
    const now = yield* DateTime.now;
    if (cachedData && now.epochMilliseconds - cachedAt < cacheDuration) {
      return cachedData;
    }
    const env = yield* Effect.promise(() => getAppEnv());
    return yield* loadFromProviders(env);
  }
);
