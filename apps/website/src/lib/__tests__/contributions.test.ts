import { Effect } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppEnv } from "@/env";
import type { ContributionsRefreshBinding, OpenSourceKVBinding } from "@/env";
import { loadContributions, refreshContributions } from "@/lib/contributions";

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

describe("open-source contribution snapshots", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      Effect.runPromise(
        loadContributions(createAppEnv({ OPEN_SOURCE_KV: binding }))
      )
    ).resolves.toStrictEqual([]);
  });

  it("publishes a complete snapshot after successful GitHub fetches", async () => {
    const { binding, values } = createKV();
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: string | URL | Request) => Promise<Response>>((input) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input)
        );
        if (url.pathname === "/search/issues") {
          return Promise.resolve(
            Response.json({
              items: [
                {
                  html_url: "https://github.com/owner/repo/pull/42",
                  number: 42,
                  pull_request: { merged_at: "2026-10-09T12:00:00Z" },
                  repository_url: "https://api.github.com/repos/owner/repo",
                  state: "closed",
                  title: "Add a useful feature",
                },
              ],
            })
          );
        }
        if (url.pathname === "/repos/owner/repo") {
          return Promise.resolve(
            Response.json({
              full_name: "owner/repo",
              owner: { avatar_url: repository.avatarUrl },
              stargazers_count: repository.stars,
            })
          );
        }
        return Promise.resolve(
          new Response("Unexpected GitHub request", { status: 404 })
        );
      })
    );

    const result = await Effect.runPromise(
      refreshContributions(createAppEnv({ OPEN_SOURCE_KV: binding }))
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
    vi.stubGlobal(
      "fetch",
      vi.fn<(input: string | URL | Request) => Promise<Response>>((input) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input)
        );
        if (url.pathname === "/search/issues") {
          return Promise.resolve(Response.json({ items: [] }));
        }
        return Promise.resolve(
          new Response("Unexpected GitHub request", { status: 404 })
        );
      })
    );

    await expect(
      Effect.runPromise(
        refreshContributions(createAppEnv({ OPEN_SOURCE_KV: failingBinding }))
      )
    ).rejects.toThrow("KV unavailable");
    expect(values.get(snapshotKey)).toBe("previous snapshot");
  });
});
