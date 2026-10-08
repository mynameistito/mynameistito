import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { decodeProfileResponse } from "@/lib/provider/mdfromx/profile";

describe("MDFromX profile decoding", () => {
  it("maps expanded JSON profile fields to the footer profile model", async () => {
    const profile = await Effect.runPromise(
      decodeProfileResponse({
        profile: {
          name: "Tito",
          screen_name: "mynameistito",
          description: "A public profile",
          location: "New Zealand",
          followers: 689,
          following: 1139,
          statuses: 5141,
          avatar_url: "https://pbs.twimg.com/avatar.jpg",
          banner_url: "",
        },
      })
    );

    expect(profile).toStrictEqual({
      name: "Tito",
      handle: "mynameistito",
      description: "A public profile",
      location: "New Zealand",
      followers: 689,
      following: 1139,
      posts: 5141,
      avatarUrl: "https://pbs.twimg.com/avatar.jpg",
      bannerUrl: null,
    });
  });

  it("returns a typed failure for malformed profile responses", async () => {
    const exit = await Effect.runPromiseExit(
      decodeProfileResponse({ profile: { following: "many" } })
    );

    expect(exit._tag).toBe("Failure");
  });
});
