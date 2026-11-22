import { Effect, Layer, Redacted } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { describe, expect, it } from "vitest";

import { GitHub, GitHubRequestError } from "@/integrations/github/client";

const fixtureToken = Redacted.make("fixture-token");

const githubWithTransport = (
  respond: (request: {
    readonly url: string;
    readonly authorization?: string;
  }) => Response,
  token: Redacted.Redacted | undefined
) => {
  const httpClient = HttpClient.make((request) =>
    Effect.sync(() =>
      HttpClientResponse.fromWeb(
        request,
        respond({
          url: request.url,
          authorization: request.headers.authorization,
        })
      )
    )
  );

  return GitHub.layerWithoutDependencies({
    username: "octocat",
    token,
  }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient)));
};

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
  it.each([
    {
      scenario: "when GitHub rejects the credential",
      token: fixtureToken,
      expectedHeaders: ["Bearer fixture-token", undefined],
    },
    {
      scenario: "when no credential is configured",
      token: null,
      expectedHeaders: [undefined],
    },
  ])(
    "loads public repositories $scenario",
    async ({ token, expectedHeaders }) => {
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

      const githubLayer = githubWithTransport(({ authorization }) => {
        authorizationHeaders.push(authorization);

        return authorization === undefined
          ? Response.json([{ ...repository, owner }])
          : Response.json({ message: "Bad credentials" }, { status: 401 });
      }, token ?? undefined);

      const repositories = await Effect.runPromise(
        GitHub.use((github) => github.listRepositories(1, 100)).pipe(
          Effect.provide(githubLayer)
        )
      );

      expect(authorizationHeaders).toStrictEqual(expectedHeaders);
      expect(repositories).toStrictEqual([
        { ...repository, owner_avatar_url: owner.avatar_url },
      ]);
    }
  );

  it("maps authenticated repositories without an anonymous retry", async () => {
    const htmlUrl = "https://github.com/octocat/example";
    const apiUrl = "https://api.github.com/repos/octocat/example";
    const avatarUrl = "https://example.com/octocat.png";

    const githubRepository = {
      ...Object.fromEntries(
        [
          "archive",
          "assignees",
          "blobs",
          "branches",
          "collaborators",
          "comments",
          "commits",
          "compare",
          "contents",
          "contributors",
          "deployments",
          "downloads",
          "events",
          "forks",
          "git_commits",
          "git_refs",
          "git_tags",
          "hooks",
          "issue_comment",
          "issue_events",
          "issues",
          "keys",
          "labels",
          "languages",
          "merges",
          "milestones",
          "notifications",
          "pulls",
          "releases",
          "stargazers",
          "statuses",
          "subscribers",
          "subscription",
          "tags",
          "teams",
          "trees",
        ].map((name) => [`${name}_url`, `${apiUrl}/${name}`])
      ),
      id: 1,
      node_id: "repository",
      name: "example",
      full_name: "octocat/example",
      html_url: htmlUrl,
      url: apiUrl,
      description: null,
      fork: false,
      private: false,
      owner: {
        ...Object.fromEntries(
          [
            "followers",
            "following",
            "gists",
            "starred",
            "subscriptions",
            "organizations",
            "repos",
            "events",
            "received_events",
          ].map((name) => [
            `${name}_url`,
            `https://api.github.com/users/octocat/${name}`,
          ])
        ),
        login: "octocat",
        id: 2,
        node_id: "user",
        avatar_url: avatarUrl,
        gravatar_id: null,
        url: "https://api.github.com/users/octocat",
        html_url: "https://github.com/octocat",
        type: "User",
        site_admin: false,
      },
    };

    const authorizationHeaders: (string | undefined)[] = [];

    const githubLayer = githubWithTransport(({ authorization }) => {
      authorizationHeaders.push(authorization);

      return Response.json([
        githubRepository,
        {
          ...githubRepository,
          name: "archived",
          full_name: "octocat/archived",
          html_url: "https://github.com/octocat/archived",
          description: "An archived project",
          archived: true,
        },
      ]);
    }, fixtureToken);

    const repositories = await Effect.runPromise(
      GitHub.use((github) => github.listRepositories(1, 100)).pipe(
        Effect.provide(githubLayer)
      )
    );

    expect(repositories).toMatchObject([
      {
        name: "example",
        full_name: "octocat/example",
        html_url: htmlUrl,
        description: null,
        archived: false,
        owner_avatar_url: avatarUrl,
      },
      {
        name: "archived",
        full_name: "octocat/archived",
        description: "An archived project",
        archived: true,
      },
    ]);
    expect(authorizationHeaders).toStrictEqual(["Bearer fixture-token"]);
  });

  it("preserves other repository list failures without an anonymous retry", async () => {
    const authorizationHeaders: (string | undefined)[] = [];

    const githubLayer = githubWithTransport(({ authorization }) => {
      authorizationHeaders.push(authorization);

      return Response.json({ message: "Forbidden" }, { status: 403 });
    }, fixtureToken);

    const error = await Effect.runPromise(
      GitHub.use((github) => github.listRepositories(1, 100)).pipe(
        Effect.provide(githubLayer),
        Effect.flip
      )
    );

    expect(error).toBeInstanceOf(GitHubRequestError);
    expect(error.cause).toMatchObject({ _tag: "Forbidden" });
    expect(authorizationHeaders).toStrictEqual(["Bearer fixture-token"]);
  });

  it("sends the credential for repository details and preserves a not-found error", async () => {
    const requests: { url: string; authorization?: string }[] = [];

    const githubLayer = githubWithTransport((request) => {
      requests.push(request);

      return Response.json({ message: "Not Found" }, { status: 404 });
    }, fixtureToken);

    const error = await Effect.runPromise(
      GitHub.use((github) => github.repository("octocat", "example")).pipe(
        Effect.provide(githubLayer),
        Effect.flip
      )
    );

    expect(error).toBeInstanceOf(GitHubRequestError);
    expect(error.cause).toMatchObject({ _tag: "NotFound" });
    expect(requests).toStrictEqual([
      {
        url: "https://api.github.com/repos/octocat/example",
        authorization: "Bearer fixture-token",
      },
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
