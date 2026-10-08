import { createServerFn } from "@tanstack/react-start";

import { getAppEnv } from "@/env";
import { listUserRepositories, runGitHub } from "@/lib/github-client";
import {
  collectRepositoryPages,
  orderProjectRepositories,
} from "@/lib/project-catalog";

/** GitHub repository metadata displayed as a portfolio project. */
export interface Project {
  readonly name: string;
  readonly description: string;
  readonly languages: readonly string[];
  readonly image: string;
  readonly featured: boolean;
  readonly source: string;
  readonly demo?: string;
  readonly readme?: string;
}

interface GitHubRepository {
  readonly name: string;
  readonly full_name: string;
  readonly html_url: string;
  readonly description: string | null;
  readonly language?: string | null;
  readonly homepage?: string | null;
  readonly fork: boolean;
  readonly private: boolean;
}

const owner = "mynameistito";
const cacheDuration = 60 * 60 * 1000;
let cachedAt = 0;
let cachedProjects: readonly Project[] | undefined;

const overrides: Readonly<Record<string, Partial<Project>>> = {};

const fetchRepositoryPage = async (
  token: string | undefined,
  page: number,
  perPage: number
): Promise<readonly GitHubRepository[]> => {
  if (token) {
    return runGitHub(
      token,
      listUserRepositories({
        username: owner,
        page,
        per_page: perPage,
        type: "owner",
      })
    );
  }
  const response = await fetch(
    `https://api.github.com/users/${owner}/repos?per_page=${perPage}&page=${page}&type=owner`,
    {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "mynameistito-portfolio",
      },
    }
  );
  if (!response.ok) {
    throw new Error(
      `GitHub projects are temporarily unavailable (HTTP ${response.status}).`
    );
  }
  // SAFETY: GitHub's repositories endpoint returns an array of repository records.
  return (await response.json()) as GitHubRepository[];
};

const fetchRepositories = (
  token: string | undefined
): Promise<readonly GitHubRepository[]> =>
  collectRepositoryPages((page, perPage) =>
    fetchRepositoryPage(token, page, perPage)
  );

const fetchProjects = async (): Promise<readonly Project[]> => {
  const bindings = await getAppEnv();
  const [profileResponse, repositories] = await Promise.all([
    fetch(`https://github.com/${owner}`, {
      headers: { "user-agent": "mynameistito-portfolio" },
    }),
    fetchRepositories(bindings.GITHUB_TOKEN),
  ]);
  if (!profileResponse.ok) {
    throw new Error("GitHub projects are temporarily unavailable.");
  }

  const html = await profileResponse.text();
  const pinnedStart = html.indexOf("pinned-item-list-item");
  if (pinnedStart === -1) {
    throw new Error("GitHub pins could not be read.");
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
};

/** Loads public, non-fork GitHub projects, using the in-memory cache. */
export const getProjects = createServerFn({ method: "GET" }).handler(
  async () => {
    if (cachedProjects && Date.now() - cachedAt < cacheDuration) {
      return cachedProjects;
    }
    try {
      cachedProjects = await fetchProjects();
      cachedAt = Date.now();
    } catch (error) {
      console.error("Failed to load GitHub projects.", error);
      if (!cachedProjects) {
        return [];
      }
    }
    return cachedProjects ?? [];
  }
);

/** Returns a stable URL-safe route segment for a project.
 * @param name - The GitHub repository name.
 * @returns The URL-safe project route segment.
 */
export const projectSlug = (name: string) =>
  name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "-");
