import {
  Cache,
  Context,
  Duration,
  Effect,
  Exit,
  Layer,
  ManagedRuntime,
  Ref,
} from "effect";

import { profile } from "@/domain/profile";
import { getAppEnv } from "@/env";
import {
  orderProjectRepositories,
  readPinnedRepositoryNames,
} from "@/features/projects/catalog";
import type { Project } from "@/features/projects/project";
import { GitHub, GitHubRequestError } from "@/integrations/github/client";
import type { Repository } from "@/integrations/github/client";
import { collectRepositoryPages } from "@/integrations/github/repository-pages";

const cacheDuration = "1 hour";
const fetchTimeout = "8 seconds";

const overrides = new Map<string, Partial<Project>>([
  [".github", { showInProjects: false }],
  ["alchemy-windows-wsarecv-repro", { showInProjects: false }],
  ["better-history", { showInProjects: false }],
  ["biome-check-write-repro", { showInProjects: false }],
  ["cf-free-tier-imgs", { showInProjects: false }],
  ["claude-notifier", { showInProjects: false }],
  ["create-tito-app", { showInProjects: false }],
  ["CSGO-CONFIGS", { showInProjects: false }],
  ["cursor-rules", { showInProjects: false }],
  ["hide-email-ext", { showInProjects: false }],
  ["hide-ip-ext", { showInProjects: false }],
  ["ig-video-controls", { showInProjects: false }],
  ["mute-tab-manager", { showInProjects: false }],
  ["native-sdk-coff-repro", { showInProjects: false }],
  ["new-tab-ext", { showInProjects: false }],
  ["opencode-config", { showInProjects: false }],
  ["opencode-dangerously-skip-permissions", { showInProjects: false }],
  ["petition-of-felix", { showInProjects: false }],
  ["opentui-vitest-windows-dll-repro", { showInProjects: false }],
  ["opentui-osc11-repro", { showInProjects: false }],
  ["opentui-pr-x", { showInProjects: false }],
  ["quote-viewer", { showInProjects: false }],
  ["r2explorer", { showInProjects: false }],
  ["router-cli-node-circular-warning", { showInProjects: false }],
  ["tampermonkey-addons", { showInProjects: false }],
  ["ultracite-benchmark", { showInProjects: false }],
  ["v0-holographic-profile-app", { showInProjects: false }],
  ["volume-master", { showInProjects: false }],
  ["windhawk-perform-speedtest", { showInProjects: false }],
  ["WOL-Android", { showInProjects: false }],
  ["workers-preview-alias-repro", { showInProjects: false }],
  ["wrangler-types-new-config-repro", { showInProjects: false }],
]);

const fetchProjects = Effect.gen(function* fetchProjects() {
  const github = yield* GitHub;

  const [html, repositories] = yield* Effect.all([
    github.profilePage,
    collectRepositoryPages<Repository, GitHubRequestError, never>(
      (page, perPage) => github.listRepositories(page, perPage)
    ),
  ]);

  const pinnedNames = readPinnedRepositoryNames(html, profile.github);

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
    const override = overrides.get(repository.name);

    const project: Project = {
      name: repository.name,
      description: repository.description ?? `${repository.name} on GitHub.`,
      languages:
        repository.language === null || repository.language === undefined
          ? []
          : [repository.language],
      image: repository.owner_avatar_url,
      archived: repository.archived,
      featured,
      source: repository.html_url,
      ...override,
    };

    const projectWithPreview =
      override?.image === undefined
        ? project
        : { ...project, previewImage: override.image };

    const homepage = repository.homepage?.trim();

    if (
      homepage !== undefined &&
      homepage.length > 0 &&
      override?.demo === undefined
    ) {
      return { ...projectWithPreview, demo: homepage };
    }

    return projectWithPreview;
  });
});

interface ProjectsDependencies {
  readonly fetch: () => Effect.Effect<readonly Project[], GitHubRequestError>;
  readonly timeout?: Duration.Input;
}

const projectsAfterFetchFailure = (
  lastKnown: Ref.Ref<readonly Project[] | null>
) =>
  Ref.get(lastKnown).pipe(
    Effect.tap(Effect.logError("Failed to load GitHub projects.")),
    Effect.map((projects) => ({
      cacheable: false,
      projects: projects ?? [],
    }))
  );

/** Cached project data shared by all requests in one Worker isolate. */
export class Projects extends Context.Service<
  Projects,
  { readonly load: () => Effect.Effect<readonly Project[]> }
>()("website/lib/Projects") {}

/** Builds the project cache in its owning Layer.
 * @param dependencies - The GitHub lookup used on cache misses.
 * @returns A service layer with a shared one-hour cache.
 */
export const makeProjectsLayer = ({
  fetch,
  timeout = fetchTimeout,
}: ProjectsDependencies) =>
  Layer.effect(
    Projects,
    Effect.gen(function* makeProjects() {
      const lastKnown = yield* Ref.make<readonly Project[] | null>(null);

      const cache = yield* Cache.makeWith(
        (_key: "projects") =>
          fetch().pipe(
            Effect.map((projects) => ({ cacheable: true, projects })),
            Effect.catchTag("GitHubRequestError", () =>
              projectsAfterFetchFailure(lastKnown)
            ),
            Effect.timeoutOrElse({
              duration: timeout,
              orElse: () => projectsAfterFetchFailure(lastKnown),
            }),
            Effect.tap(({ cacheable, projects }) =>
              cacheable ? Ref.set(lastKnown, projects) : Effect.void
            )
          ),
        {
          capacity: 1,
          timeToLive: (exit) =>
            Exit.isSuccess(exit) && exit.value.cacheable
              ? cacheDuration
              : Duration.zero,
        }
      );

      const load = Effect.fn("Projects.load")(function* load() {
        const cached = yield* Cache.get(cache, "projects");

        return cached.projects;
      });

      return Projects.of({ load });
    })
  );

const projectsLayer = Layer.unwrap(
  Effect.gen(function* createRuntimeProjectsLayer(): Effect.fn.Return<
    Layer.Layer<Projects>
  > {
    const env = yield* getAppEnv();

    return makeProjectsLayer({
      fetch: () =>
        fetchProjects.pipe(
          Effect.provide(
            GitHub.layer({ username: profile.github, token: env.GITHUB_TOKEN })
          )
        ),
    });
  })
);

const projectsRuntime = ManagedRuntime.make(projectsLayer);

/** Loads cached public, non-fork projects using GitHub as the source.
 * @returns The latest available project list.
 */
export const loadProjects = async () =>
  await projectsRuntime.runPromise(
    Effect.gen(function* loadProjectsProgram() {
      const projects = yield* Projects;

      return yield* projects.load();
    })
  );
