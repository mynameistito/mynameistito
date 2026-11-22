import { Effect, Layer, Redacted } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { describe, expect, it } from "vitest";

import { GitHub } from "@/integrations/github/client";

const searchPullRequests = async (token?: Redacted.Redacted) => {
  const searchRequests: string[] = [];
  const rateLimitNames: string[] = [];
  const rateLimitIntervals: number[] = [];

  const httpClient = HttpClient.make((request) => {
    searchRequests.push(request.url);

    return Effect.succeed(
      HttpClientResponse.fromWeb(
        request,
        Response.json({ total_count: 0, items: [] })
      )
    );
  });

  const httpClientLayer = Layer.succeed(HttpClient.HttpClient, httpClient);

  const githubLayer = GitHub.layerWithoutDependencies({
    username: "octocat",
    token,
    searchRateLimiter: {
      getByName: (name) => {
        rateLimitNames.push(name);

        return {
          reserveSlot: async (intervalMs) => {
            rateLimitIntervals.push(intervalMs);

            return await Promise.resolve(0);
          },
        };
      },
    },
  }).pipe(Layer.provide(httpClientLayer));

  const results = await Effect.runPromise(
    Effect.provide(
      Effect.gen(function* searchPullRequestsEffect() {
        const github = yield* GitHub;

        return yield* github.searchPullRequests;
      }),
      githubLayer
    )
  );

  return { rateLimitIntervals, rateLimitNames, results, searchRequests };
};

describe("GitHub client", () => {
  it("loads public repositories when GitHub rejects the credential", async () => {
    const { owner, ...repository } = {
      name: "example",
      full_name: "octocat/example",
      html_url: "https://github.com/octocat/example",
      description: null,
      archived: false,
      fork: false,
      private: false,
      owner: { avatar_url: "https://example.com/octocat.png" },
    };

    const authorizationHeaders: (string | undefined)[] = [];

    const httpClient = HttpClient.make((request) => {
      const { authorization } = request.headers;
      authorizationHeaders.push(authorization);

      const response = authorization
        ? Response.json({ message: "Bad credentials" }, { status: 401 })
        : Response.json([{ ...repository, owner }]);

      return Effect.succeed(HttpClientResponse.fromWeb(request, response));
    });

    const githubLayer = GitHub.layerWithoutDependencies({
      username: "octocat",
      token: Redacted.make("expired-test-token"),
    }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient)));

    const repositories = await Effect.runPromise(
      GitHub.use((github) => github.listRepositories(1, 100)).pipe(
        Effect.provide(githubLayer)
      )
    );

    expect(authorizationHeaders).toStrictEqual([
      "Bearer expired-test-token",
      undefined,
    ]);
    expect(repositories).toStrictEqual([
      { ...repository, owner_avatar_url: owner.avatar_url },
    ]);
  });

  it("uses the shared anonymous Search API quota", async () => {
    const { rateLimitIntervals, rateLimitNames, results, searchRequests } =
      await searchPullRequests();

    expect(results).toStrictEqual([]);
    expect(searchRequests).toHaveLength(1);
    expect(searchRequests[0]).toContain("author%3Aoctocat");
    expect(rateLimitNames).toStrictEqual(["github-search:unauthenticated"]);
    expect(rateLimitIntervals).toStrictEqual([6100]);
  }, 10_000);

  it("uses a hashed token identity and the authenticated quota", async () => {
    const token = "test-github-token";

    const { rateLimitIntervals, rateLimitNames, results, searchRequests } =
      await searchPullRequests(Redacted.make(token));

    expect(results).toStrictEqual([]);
    expect(searchRequests).toHaveLength(1);
    expect(rateLimitNames[0]).toMatch(
      /^github-search:authenticated:[a-f0-9]{64}$/u
    );
    expect(rateLimitNames[0]).not.toContain(token);
    expect(rateLimitIntervals).toStrictEqual([6100]);
  });
});
