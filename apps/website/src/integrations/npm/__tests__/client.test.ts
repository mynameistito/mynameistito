import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { describe, expect, it } from "vitest";

import { NpmRegistry } from "@/integrations/npm/client";
import { NpmRegistryError } from "@/integrations/npm/errors";

const searchWithResponse = async (response: Response) => {
  const requests: string[] = [];

  const httpClient = HttpClient.make((request) => {
    requests.push(request.url);

    return Effect.succeed(HttpClientResponse.fromWeb(request, response));
  });

  const registryLayer = NpmRegistry.layerWithoutDependencies.pipe(
    Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient))
  );

  const search = Effect.gen(function* searchNpmRegistry() {
    const registry = yield* NpmRegistry;

    return yield* registry.search.pipe(
      Effect.catchTag("NpmRegistryError", (failure) =>
        Effect.succeed({ failure })
      )
    );
  }).pipe(Effect.provide(registryLayer));

  return { requests, result: await Effect.runPromise(search) };
};

describe("npm registry adapter", () => {
  it("parses, normalizes, and sorts registry search results", async () => {
    const { requests, result } = await searchWithResponse(
      Response.json({
        objects: [
          {
            downloads: { weekly: 2 },
            package: {
              name: "zulu",
              version: "2.0.0",
              description: "Zulu package",
              links: {
                npm: "https://registry.npmjs.org/zulu",
                repository: "git+https://github.com/example/zulu.git",
              },
            },
          },
          {
            downloads: { weekly: 10 },
            package: { name: "alpha", version: "1.0.0" },
          },
        ],
      })
    );

    expect(result).toStrictEqual([
      {
        name: "alpha",
        description: "No description provided.",
        version: "1.0.0",
        weeklyDownloads: 10,
        npmUrl: "https://www.npmjs.com/package/alpha",
      },
      {
        name: "zulu",
        description: "Zulu package",
        version: "2.0.0",
        weeklyDownloads: 2,
        npmUrl: "https://registry.npmjs.org/zulu",
        repositoryUrl: "https://github.com/example/zulu",
      },
    ]);
    expect(requests).toHaveLength(1);
    const [requestUrl] = requests;

    if (requestUrl === undefined) {
      throw new Error("Expected the npm search request to be recorded.");
    }

    const { searchParams } = new URL(requestUrl);
    expect(searchParams.get("text")).toBe("maintainer:mynameistito");
    expect(searchParams.get("size")).toBe("250");
  });

  it("maps unsuccessful HTTP responses to NpmRegistryError", async () => {
    const { result } = await searchWithResponse(
      Response.json({}, { status: 503 })
    );

    expect("failure" in result).toBeTruthy();

    if (!("failure" in result)) {
      return;
    }

    expect(result.failure).toBeInstanceOf(NpmRegistryError);
  });

  it("maps malformed registry payloads to NpmRegistryError", async () => {
    const { result } = await searchWithResponse(Response.json({ items: [] }));

    expect("failure" in result).toBeTruthy();

    if (!("failure" in result)) {
      return;
    }

    expect(result.failure).toBeInstanceOf(NpmRegistryError);
  });
});
