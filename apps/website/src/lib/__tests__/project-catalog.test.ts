import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import {
  orderProjectRepositories,
  readPinnedRepositoryNames,
} from "@/lib/project-catalog";
import { collectRepositoryPages } from "@/lib/provider/github/repository-pages";

describe("project catalog", () => {
  it("collects all repository pages, including a final partial page", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => index);
    const calls: { page: number; perPage: number }[] = [];

    const repositories = await Effect.runPromise(
      collectRepositoryPages((page, perPage) => {
        calls.push({ page, perPage });
        return Effect.succeed(page === 1 ? firstPage : [100]);
      })
    );

    expect(repositories).toHaveLength(101);
    expect(calls).toStrictEqual([
      { page: 1, perPage: 100 },
      { page: 2, perPage: 100 },
    ]);
  });

  it("orders pins first and includes other public non-fork repositories", () => {
    const repositories = [
      { fork: false, name: "unpinned-first", private: false },
      { fork: false, name: "pin-three", private: false },
      { fork: true, name: "forked", private: false },
      { fork: false, name: "private", private: true },
      { fork: false, name: "pin-one", private: false },
      { fork: false, name: "pin-two", private: false },
      { fork: false, name: "pin-four", private: false },
      { fork: false, name: "unpinned-last", private: false },
    ];

    const result = orderProjectRepositories(repositories, [
      "pin-three",
      "pin-one",
      "pin-two",
      "missing-pin",
      "pin-four",
      "pin-three",
    ]);

    expect(
      result.map(({ repository, featured }) => [repository.name, featured])
    ).toStrictEqual([
      ["pin-three", true],
      ["pin-one", true],
      ["pin-two", true],
      ["pin-four", false],
      ["unpinned-first", false],
      ["unpinned-last", false],
    ]);
  });

  it("reads unique pins in markup order and ignores links outside pin items", () => {
    const html = `
      <li class="pinned-item-list-item"><a href="/mynameistito/first">first</a></li>
      <li class="pinned-item-list-item"><a href="/mynameistito/second">second</a></li>
      <li class="pinned-item-list-item"><a href="/mynameistito/first">duplicate</a></li>
      <a href="/mynameistito/not-a-pin">other</a>
    `;

    expect(readPinnedRepositoryNames(html, "mynameistito")).toStrictEqual([
      "first",
      "second",
    ]);
  });

  it("returns null when GitHub pin markup is missing", () => {
    expect(
      readPinnedRepositoryNames(
        '<a href="/mynameistito/project">',
        "mynameistito"
      )
    ).toBeNull();
  });

  it("matches the configured username as a literal path segment", () => {
    expect(
      readPinnedRepositoryNames(
        '<li class="pinned-item-list-item"><a href="/name.with+symbols/project">project</a></li>',
        "name.with+symbols"
      )
    ).toStrictEqual(["project"]);
  });
});
