import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { describe, expect, it } from "vitest";

import { GitHub } from "@/lib/provider/github/client";

describe("GitHub client", () => {
  it("searches pull requests through the rate-limited search client", async () => {
    const searchRequests: string[] = [];

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
    }).pipe(Layer.provide(httpClientLayer));

    const results = await Effect.runPromise(
      Effect.provide(
        Effect.gen(function* searchPullRequests() {
          const github = yield* GitHub;

          return yield* github.searchPullRequests;
        }),
        githubLayer
      )
    );

    expect(results).toStrictEqual([]);
    expect(searchRequests).toHaveLength(1);
    expect(searchRequests[0]).toContain("author%3Aoctocat");
  }, 10_000);
});
