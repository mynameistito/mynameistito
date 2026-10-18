import { Effect, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";

import { makeProjectsLayer, Projects } from "@/lib/projects";
import { GitHubRequestError } from "@/lib/provider/github/client";

describe("project cache", () => {
  it("retries failed lookups and caches the next successful result", async () => {
    let calls = 0;

    const projects = [
      {
        name: "example",
        description: "Example project",
        languages: ["TypeScript"],
        image: "https://example.com/avatar.png",
        archived: false,
        featured: true,
        source: "https://github.com/example/example",
      },
    ] as const;

    const runtime = ManagedRuntime.make(
      makeProjectsLayer({
        fetch: () => {
          calls += 1;

          return calls === 1
            ? Effect.fail(
                new GitHubRequestError({
                  operation: "listRepositories",
                  cause: new Error("temporary failure"),
                })
              )
            : Effect.succeed(projects);
        },
      })
    );

    const load = async () =>
      await runtime.runPromise(
        Effect.gen(function* loadProjectsFromService() {
          const service = yield* Projects;

          return yield* service.load();
        })
      );

    try {
      await expect(load()).resolves.toStrictEqual([]);
      await expect(load()).resolves.toStrictEqual(projects);
      await expect(load()).resolves.toStrictEqual(projects);
      expect(calls).toBe(2);
    } finally {
      await runtime.dispose();
    }
  });
});
