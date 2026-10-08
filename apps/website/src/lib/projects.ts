import { DateTime, Effect } from "effect";

import { getAppEnv } from "@/env";
import { profile } from "@/lib/profile";
import type { Project } from "@/lib/project";
import {
  orderProjectRepositories,
  readPinnedRepositoryNames,
} from "@/lib/project-catalog";
import { GitHub, GitHubRequestError } from "@/lib/provider/github/client";
import type { Repository } from "@/lib/provider/github/client";
import { collectRepositoryPages } from "@/lib/provider/github/repository-pages";

const cacheDuration = 60 * 60 * 1000;
let cachedAt = 0;
let cachedProjects: readonly Project[] | undefined;

const overrides: Readonly<Record<string, Partial<Project>>> = {};

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
      image: repository.owner_avatar_url,
      featured,
      source: repository.html_url,
      ...override,
    };
    const projectWithPreview = override?.image
      ? { ...project, previewImage: override.image }
      : project;
    if (repository.homepage && !override?.demo) {
      return { ...projectWithPreview, demo: repository.homepage };
    }
    return projectWithPreview;
  });
});

/** Loads cached public, non-fork projects using GitHub as the source. */
export const loadProjects = Effect.fn("loadProjects")(function* loadProjects() {
  const now = yield* DateTime.now;
  if (cachedProjects && now.epochMilliseconds - cachedAt < cacheDuration) {
    return cachedProjects;
  }
  const env = yield* getAppEnv();
  return yield* fetchProjects.pipe(
    Effect.provide(
      GitHub.layer({
        username: profile.github,
        token: env.GITHUB_TOKEN,
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
