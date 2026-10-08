import { DateTime, Effect, Redacted } from "effect";

import { getAppEnv } from "@/env";
import { profile } from "@/lib/profile";
import type { Project } from "@/lib/project";
import { orderProjectRepositories } from "@/lib/project-catalog";
import { GitHub, GitHubRequestError } from "@/lib/provider/github/client";
import type { Repository } from "@/lib/provider/github/client";
import { collectRepositoryPages } from "@/lib/provider/github/repository-pages";

const cacheDuration = 60 * 60 * 1000;
let cachedAt = 0;
let cachedProjects: readonly Project[] | undefined;

const overrides: Readonly<Record<string, Partial<Project>>> = {};

const readPinnedRepositoryNames = (html: string) => {
  const pinnedStart = html.indexOf("pinned-item-list-item");
  if (pinnedStart === -1) {
    return null;
  }
  const pinnedMarkup = html.slice(pinnedStart);
  const pinnedNames: string[] = [];
  const pinnedNameSet = new Set<string>();
  for (const match of pinnedMarkup.matchAll(
    /href="\/mynameistito\/(?<name>[^"/]+)"/gu
  )) {
    const { name } = match.groups ?? {};
    if (name && !pinnedNameSet.has(name)) {
      pinnedNames.push(name);
      pinnedNameSet.add(name);
    }
    if (pinnedNames.length === 6) {
      break;
    }
  }
  return pinnedNames;
};

const fetchProjects = Effect.gen(function* fetchProjects() {
  const github = yield* GitHub;
  const [html, repositories] = yield* Effect.all([
    github.profilePage,
    collectRepositoryPages<Repository, GitHubRequestError, never>(
      (page, perPage) => github.listRepositories(page, perPage)
    ),
  ]);
  const pinnedNames = readPinnedRepositoryNames(html);
  if (!pinnedNames) {
    return yield* new GitHubRequestError({
      operation: "readPinnedRepositories",
      cause: new Error("GitHub pins could not be read."),
    });
  }

  const orderedRepositories = orderProjectRepositories(
    repositories,
    pinnedNames
  );
  return orderedRepositories.map(({ repository, featured }) => {
    const override = overrides[repository.name];
    const project: Project = {
      name: repository.name,
      description: repository.description ?? `${repository.name} on GitHub.`,
      languages: repository.language ? [repository.language] : [],
      image: `https://opengraph.githubassets.com/1/${repository.full_name}`,
      featured,
      source: repository.html_url,
      ...override,
    };
    if (repository.homepage && !override?.demo) {
      return { ...project, demo: repository.homepage };
    }
    return project;
  });
});

/** Loads cached public, non-fork projects using GitHub as the source. */
export const loadProjects = Effect.fn("loadProjects")(function* loadProjects() {
  const now = yield* DateTime.now;
  if (cachedProjects && now.epochMilliseconds - cachedAt < cacheDuration) {
    return cachedProjects;
  }
  const env = yield* Effect.promise(() => getAppEnv());
  return yield* fetchProjects.pipe(
    Effect.provide(
      GitHub.layer({
        username: profile.github,
        token: env.GITHUB_TOKEN ? Redacted.make(env.GITHUB_TOKEN) : undefined,
      })
    ),
    Effect.tap((projects) =>
      Effect.sync(() => {
        cachedProjects = projects;
        cachedAt = now.epochMilliseconds;
      })
    ),
    Effect.catchTag("GitHubRequestError", (error) => {
      console.error("Failed to load GitHub projects.", error._tag);
      return Effect.succeed(cachedProjects ?? []);
    })
  );
});
