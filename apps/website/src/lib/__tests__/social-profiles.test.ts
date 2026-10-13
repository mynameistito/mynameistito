import { Effect, Layer, ManagedRuntime } from "effect";
import { TestClock } from "effect/testing";
import { describe, expect, it } from "vitest";

import { makeSocialProfilesLayer, SocialProfiles } from "@/lib/social-profiles";
import type { SocialProfileData } from "@/lib/social-profiles";

const profileData: SocialProfileData = {
  github: null,
  x: {
    name: "Example",
    handle: "example",
    description: "",
    location: "",
    followers: 1,
    following: 0,
    posts: null,
    avatarUrl: null,
    bannerUrl: null,
  },
  tokscale: null,
};

const loadSocialProfiles = Effect.gen(function* loadSocialProfilesProgram() {
  const service = yield* SocialProfiles;
  return yield* service.load();
});

describe("social profile cache", () => {
  it("shares cached provider data across calls while checking missing Tokscale data", async () => {
    let providerCalls = 0;
    let tokscaleCalls = 0;
    const runtime = ManagedRuntime.make(
      makeSocialProfilesLayer({
        loadProviders: () =>
          Effect.sync(() => {
            providerCalls += 1;
            return profileData;
          }),
        loadTokscale: () =>
          Effect.sync(() => {
            tokscaleCalls += 1;
            return null;
          }),
      })
    );

    try {
      const results = await runtime.runPromise(
        Effect.all([loadSocialProfiles, loadSocialProfiles], {
          concurrency: "unbounded",
        })
      );
      await runtime.runPromise(loadSocialProfiles);

      expect(results).toStrictEqual([profileData, profileData]);
      expect(providerCalls).toBe(1);
      expect(tokscaleCalls).toBe(3);
    } finally {
      await runtime.dispose();
    }
  });

  it("does not cache a result when no provider returns profile data", async () => {
    let providerCalls = 0;
    const emptyData: SocialProfileData = {
      github: null,
      x: null,
      tokscale: null,
    };
    const runtime = ManagedRuntime.make(
      makeSocialProfilesLayer({
        loadProviders: () =>
          Effect.sync(() => {
            providerCalls += 1;
            return emptyData;
          }),
        loadTokscale: () => Effect.succeed(null),
      })
    );

    try {
      await runtime.runPromise(loadSocialProfiles);
      await runtime.runPromise(loadSocialProfiles);

      expect(providerCalls).toBe(2);
    } finally {
      await runtime.dispose();
    }
  });

  it("expires provider data after thirty minutes", async () => {
    let providerCalls = 0;
    const layer = makeSocialProfilesLayer({
      loadProviders: () =>
        Effect.sync(() => {
          providerCalls += 1;
          return profileData;
        }),
      loadTokscale: () => Effect.succeed(null),
    }).pipe(Layer.provideMerge(TestClock.layer()));

    await Effect.runPromise(
      Effect.provide(
        Effect.gen(function* expireSocialProfileCache() {
          const service = yield* SocialProfiles;
          yield* service.load();
          yield* service.load();
          yield* TestClock.adjust("30 minutes");
          yield* service.load();
        }),
        layer
      )
    );
    expect(providerCalls).toBe(2);
  });
});
