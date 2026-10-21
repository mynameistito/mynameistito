import { Effect, ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";

import type { Project } from "@/features/projects/project";
import { makeProjectsLayer, Projects } from "@/features/projects/projects";
import { GitHubRequestError } from "@/integrations/github/client";

const loadProjects = async (
  runtime: ManagedRuntime.ManagedRuntime<Projects, never>
): Promise<readonly Project[]> =>
  await runtime.runPromise(
    Effect.gen(function* loadProjectsFromService() {
      const service = yield* Projects;

      return yield* service.load();
    })
  );

describe("project cache", () => {
  it("falls back when a project lookup hangs and retries the next request", async () => {
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

          return calls === 1 ? Effect.never : Effect.succeed(projects);
        },
        timeout: "1 millis",
      })
    );

    try {
      await expect(loadProjects(runtime)).resolves.toStrictEqual([]);
      await expect(loadProjects(runtime)).resolves.toStrictEqual(projects);
      expect(calls).toBe(2);
    } finally {
      await runtime.dispose();
    }
  });

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

    try {
      await expect(loadProjects(runtime)).resolves.toStrictEqual([]);
      await expect(loadProjects(runtime)).resolves.toStrictEqual(projects);
      await expect(loadProjects(runtime)).resolves.toStrictEqual(projects);
      expect(calls).toBe(2);
    } finally {
      await runtime.dispose();
    }
  });
});
