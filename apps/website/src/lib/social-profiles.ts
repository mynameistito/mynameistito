import {
  Cache,
  Context,
  DateTime,
  Duration,
  Effect,
  Exit,
  Layer,
  ManagedRuntime,
  Ref,
} from "effect";

import { getAppEnv } from "@/env";
import type { AppEnv } from "@/env";
import { oneYearBeforeUtcInstant } from "@/lib/contribution-period";
import { profile } from "@/lib/profile";
import { GitHub } from "@/lib/provider/github/client";
import type { Profile as GitHubProfile } from "@/lib/provider/github/client";
import { MDFromX } from "@/lib/provider/mdfromx/profile";
import type { Profile as XProfile } from "@/lib/provider/mdfromx/profile";
import { loadTokscale } from "@/lib/provider/tokscale/snapshot";
import type { TokscaleSnapshot } from "@/lib/provider/tokscale/snapshot";

const cacheDuration = "30 minutes";

/** Profile data consumed by the social footer previews. */
export interface SocialProfileData {
  readonly github: GitHubProfile | null;
  readonly x: XProfile | null;
  readonly tokscale: TokscaleSnapshot["data"] | null;
}

const loadFromProviders = (
  env: AppEnv,
  lastKnown: Ref.Ref<SocialProfileData | null>
) =>
  Effect.gen(function* loadSocialProfileProgram() {
    const github = yield* GitHub;
    const mdfromx = yield* MDFromX;
    const now = yield* DateTime.now;
    const endDate = DateTime.formatIso(now);
    const startDate = oneYearBeforeUtcInstant(new Date(now.epochMilliseconds));

    const [githubProfile, xProfile, tokscaleSnapshot] = yield* Effect.all(
      [
        github
          .profile(profile.github, startDate, endDate)
          .pipe(
            Effect.catchTag("GitHubRequestError", () =>
              Ref.get(lastKnown).pipe(
                Effect.map((cached) => cached?.github ?? null)
              )
            )
          ),
        mdfromx
          .profile(profile.x)
          .pipe(
            Effect.catchTag("MDFromXRequestError", () =>
              Ref.get(lastKnown).pipe(Effect.map((cached) => cached?.x ?? null))
            )
          ),
        loadTokscale(),
      ],
      { concurrency: "unbounded" }
    );

    const nextData: SocialProfileData = {
      github: githubProfile,
      x: xProfile,
      tokscale: tokscaleSnapshot?.data ?? null,
    };

    if (nextData.github || nextData.x || nextData.tokscale) {
      yield* Ref.set(lastKnown, nextData);
    }

    return nextData;
  }).pipe(
    Effect.provide(
      Layer.merge(
        GitHub.layer({
          username: profile.github,
          token: env.GITHUB_TOKEN,
        }),
        MDFromX.layer(env.MDFROMX_API_KEY)
      )
    )
  );

interface SocialProfilesDependencies {
  readonly loadProviders: (
    lastKnown: Ref.Ref<SocialProfileData | null>
  ) => Effect.Effect<SocialProfileData, unknown>;
  readonly loadTokscale: () => Effect.Effect<TokscaleSnapshot | null, unknown>;
}

export const SocialProfiles = Context.Service<{
  readonly load: () => Effect.Effect<SocialProfileData, unknown>;
}>("website/lib/SocialProfiles");

/** Builds the social-profile cache in its owning Layer.
 * @param dependencies - Provider lookups used on cache misses.
 * @returns A service layer with a shared 30-minute cache.
 */
export const makeSocialProfilesLayer = ({
  loadProviders,
  loadTokscale: loadTokscaleSnapshot,
}: SocialProfilesDependencies) =>
  Layer.effect(
    SocialProfiles,
    Effect.gen(function* makeSocialProfiles() {
      const lastKnown = yield* Ref.make<SocialProfileData | null>(null);

      const cache = yield* Cache.makeWith(
        (_key: "social-profiles") =>
          loadProviders(lastKnown).pipe(
            Effect.map((data) => ({
              cacheable: Boolean(data.github || data.x || data.tokscale),
              data,
            }))
          ),
        {
          capacity: 1,
          timeToLive: (exit) =>
            Exit.isSuccess(exit) && exit.value.cacheable
              ? cacheDuration
              : Duration.zero,
        }
      );

      const load = Effect.fn("SocialProfiles.load")(function* load() {
        const cached = yield* Cache.get(cache, "social-profiles");

        if (cached.data.tokscale) {
          return cached.data;
        }

        const snapshot = yield* loadTokscaleSnapshot();

        if (!snapshot) {
          return cached.data;
        }

        const data = { ...cached.data, tokscale: snapshot.data };
        yield* Ref.set(lastKnown, data);

        return data;
      });

      return SocialProfiles.of({ load });
    })
  );

const socialProfilesLayer = makeSocialProfilesLayer({
  loadProviders: (lastKnown) =>
    Effect.flatMap(getAppEnv(), (env) => loadFromProviders(env, lastKnown)),
  loadTokscale,
});

// Reuse one runtime per Worker isolate so its Layer-owned cache spans requests.
const socialProfilesRuntime = ManagedRuntime.make(socialProfilesLayer);

/** Loads cached public GitHub, X, and Tokscale profile details.
 * @returns The latest available social profile data.
 */
export const loadSocialProfiles = () =>
  socialProfilesRuntime.runPromise(
    Effect.gen(function* loadSocialProfilesProgram() {
      const service = yield* SocialProfiles;

      return yield* service.load();
    })
  );
