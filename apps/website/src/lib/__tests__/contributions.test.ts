import { Effect, Layer } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppEnv } from "@/env";
import type { ContributionsRefreshBinding, OpenSourceKVBinding } from "@/env";
import { loadContributions, refreshContributions } from "@/lib/contributions";
import { GitHub } from "@/lib/provider/github/client";
import type { PullRequestSearchItem } from "@/lib/provider/github/client";
import { GitHubRequestError } from "@/lib/provider/github/errors";

const snapshotKey = "open-source:contributions:v1";

const createKV = (initial?: string) => {
  const values = new Map<string, string>();
  if (initial !== undefined) {
    values.set(snapshotKey, initial);
  }
  const binding: OpenSourceKVBinding = {
    get: (key) => Promise.resolve(values.get(key) ?? null),
    put: (key, value) => {
      values.set(key, value);
      return Promise.resolve();
    },
  };
  return { binding, values };
};

const repository = {
  avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
  featured: false,
  name: "repo",
  pullRequests: [
    {
      number: 42,
      state: "Merged",
      title: "Add a useful feature",
      url: "https://github.com/owner/repo/pull/42",
    },
  ],
  repo: "owner/repo",
  stars: 1200,
  url: "https://github.com/owner/repo",
} as const;

const pullRequest = {
  html_url: "https://github.com/owner/repo/pull/42",
  number: 42,
  pull_request: { merged_at: "2026-10-09T12:00:00Z" },
  repository_url: "https://api.github.com/repos/owner/repo",
  state: "closed",
  title: "Add a useful feature",
} satisfies PullRequestSearchItem;

const createGitHubLayer = (
  searchPullRequests: readonly PullRequestSearchItem[],
  repositoryLookup: GitHub["Service"]["repository"]
) =>
  Layer.succeed(
    GitHub,
    GitHub.of({
      listRepositories: () => Effect.succeed([]),
      profilePage: Effect.succeed(""),
      searchPullRequests: Effect.succeed(searchPullRequests),
      repository: repositoryLookup,
      profile: () =>
        Effect.fail(
          new GitHubRequestError({
            operation: "profile",
            cause: new Error(
              "Profile is not used by contribution refresh tests."
            ),
          })
        ),
    })
  );

describe("open-source contribution snapshots", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serves the last valid KV snapshot without contacting GitHub", async () => {
    const { binding } = createKV(
      JSON.stringify({
        refreshedAt: "2026-10-10T00:00:00Z",
        repositories: [repository],
      })
    );
    const create = vi
      .fn<ContributionsRefreshBinding["create"]>()
      .mockResolvedValue({ id: "should-not-run" });
    const env = createAppEnv({
      OPEN_SOURCE_KV: binding,
      CONTRIBUTIONS_REFRESH: { create },
    });

    await expect(
      Effect.runPromise(loadContributions(env))
    ).resolves.toStrictEqual([repository]);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns promptly and starts one deterministic bootstrap Workflow on a cache miss", async () => {
    const { binding } = createKV();
    const create = vi
      .fn<ContributionsRefreshBinding["create"]>()
      .mockImplementation(({ id }) => Promise.resolve({ id }));
    const env = createAppEnv({
      OPEN_SOURCE_KV: binding,
      CONTRIBUTIONS_REFRESH: { create },
    });

    await expect(
      Effect.runPromise(loadContributions(env))
    ).resolves.toStrictEqual([]);
    expect(create).toHaveBeenCalledWith({
      id: expect.stringMatching(/^contributions-bootstrap-\d+$/u),
      params: {},
    });
  });

  it("ignores a malformed snapshot instead of failing the page loader", async () => {
    const { binding } = createKV("not-json");
    const create = vi
      .fn<ContributionsRefreshBinding["create"]>()
      .mockImplementation(({ id }) => Promise.resolve({ id }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      Effect.runPromise(
        loadContributions(
          createAppEnv({
            OPEN_SOURCE_KV: binding,
            CONTRIBUTIONS_REFRESH: { create },
          })
        )
      )
    ).resolves.toStrictEqual([]);
    expect(create).toHaveBeenCalledOnce();
  });

  it("publishes a complete snapshot after successful GitHub fetches", async () => {
    const { binding, values } = createKV();
    const githubLayer = createGitHubLayer([pullRequest], () =>
      Effect.succeed({
        full_name: repository.repo,
        stargazers_count: repository.stars,
        owner_avatar_url: repository.avatarUrl,
      })
    );

    const result = await Effect.runPromise(
      refreshContributions(
        createAppEnv({ OPEN_SOURCE_KV: binding }),
        githubLayer
      )
    );

    expect(result.repositoryCount).toBe(1);
    const stored = JSON.parse(values.get(snapshotKey) ?? "null");
    expect(stored).toMatchObject({ repositories: [repository] });
    expect(stored.refreshedAt).toStrictEqual(expect.any(String));
  });

  it("keeps the old snapshot when publishing the refreshed data fails", async () => {
    const { binding, values } = createKV("previous snapshot");
    const failingBinding: OpenSourceKVBinding = {
      ...binding,
      put: () => Promise.reject(new Error("KV unavailable")),
    };
    const githubLayer = createGitHubLayer([], () =>
      Effect.succeed({
        full_name: repository.repo,
        stargazers_count: repository.stars,
        owner_avatar_url: repository.avatarUrl,
      })
    );

    await expect(
      Effect.runPromise(
        refreshContributions(
          createAppEnv({ OPEN_SOURCE_KV: failingBinding }),
          githubLayer
        )
      )
    ).rejects.toThrow("KV unavailable");
    expect(values.get(snapshotKey)).toBe("previous snapshot");
  });

  it("keeps the old snapshot when a repository lookup fails", async () => {
    const { binding, values } = createKV("previous snapshot");
    const githubError = new GitHubRequestError({
      operation: "repository",
      cause: new Error("GitHub unavailable"),
    });
    const githubLayer = createGitHubLayer([pullRequest], () =>
      Effect.fail(githubError)
    );

    await expect(
      Effect.runPromise(
        refreshContributions(
          createAppEnv({ OPEN_SOURCE_KV: binding }),
          githubLayer
        )
      )
    ).rejects.toMatchObject({ _tag: "GitHubRequestError" });
    expect(values.get(snapshotKey)).toBe("previous snapshot");
  });
});
