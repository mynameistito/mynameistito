import { createServerFn } from "@tanstack/react-start";

import { getAppEnv } from "@/env";
import {
  getRepository,
  runGitHub,
  searchIssuesAndPullRequests,
} from "@/lib/github-client";

/** Pull request lifecycle states shown in the open-source browser. */
export type PullRequestState = "Open" | "Merged" | "Closed";

/** A pull request Tito authored in an external repository. */
export interface ContributionPullRequest {
  readonly title: string;
  readonly state: PullRequestState;
  readonly number: number;
  readonly url: string;
}

/** Repository and pull requests included in the contribution browser. */
export interface ContributionRepository {
  readonly name: string;
  readonly repo: string;
  readonly stars: number;
  readonly url: string;
  readonly pullRequests: readonly ContributionPullRequest[];
}

interface SearchResult {
  readonly title: string;
  readonly number: number;
  readonly state: string;
  readonly html_url: string;
  readonly repository_url: string;
  readonly pull_request?: { readonly merged_at?: string | null };
}

interface RepositoryResponse {
  readonly full_name: string;
  readonly stargazers_count: number;
}

interface SearchResponse {
  readonly items: readonly SearchResult[];
}

const cacheDuration = 24 * 60 * 60 * 1000;
const minimumStars = 1000;
let cachedAt = 0;
let cachedContributions: readonly ContributionRepository[] | undefined;

const searchContributions = async (
  token: string | undefined
): Promise<SearchResponse> => {
  if (token) {
    const response = await runGitHub(
      token,
      searchIssuesAndPullRequests({
        q: "author:mynameistito type:pr",
        per_page: 100,
        sort: "updated",
        order: "desc",
      })
    );
    return {
      items: response.items.map((item) => ({
        title: item.title,
        number: item.number,
        state: item.state,
        html_url: item.html_url,
        repository_url: item.repository_url,
        pull_request: item.pull_request
          ? { merged_at: item.pull_request.merged_at }
          : undefined,
      })),
    };
  }

  const response = await fetch(
    "https://api.github.com/search/issues?q=author%3Amynameistito+type%3Apr&per_page=100&sort=updated",
    {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "mynameistito-portfolio",
      },
    }
  );
  if (!response.ok) {
    throw new Error("GitHub contributions are unavailable.");
  }
  // SAFETY: The public search endpoint returns an `items` array of issue records.
  return (await response.json()) as SearchResponse;
};

const fetchRepository = async (
  repositoryUrl: string,
  token: string | undefined
): Promise<RepositoryResponse | null> => {
  const repositoryPath = new URL(repositoryUrl).pathname
    .split("/")
    .filter(Boolean);
  const [owner, repo] = repositoryPath.slice(-2);
  if (!owner || !repo) {
    return null;
  }
  if (token) {
    return runGitHub(token, getRepository({ owner, repo }));
  }
  const response = await fetch(repositoryUrl, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "mynameistito-portfolio",
    },
  });
  if (!response.ok) {
    return null;
  }
  // SAFETY: This endpoint returns the repository object referenced by `repository_url`.
  return (await response.json()) as RepositoryResponse;
};

const fetchContributions = async (): Promise<
  readonly ContributionRepository[]
> => {
  const bindings = await getAppEnv();
  const results = await searchContributions(bindings.GITHUB_TOKEN);
  const groups = new Map<string, SearchResult[]>();
  for (const item of results.items) {
    const group = groups.get(item.repository_url) ?? [];
    group.push(item);
    groups.set(item.repository_url, group);
  }

  const repos = [...groups.entries()].slice(0, 40);
  const contributionData = await Promise.all(
    repos.map(async ([repositoryUrl, items]) => {
      const repository = await fetchRepository(
        repositoryUrl,
        bindings.GITHUB_TOKEN
      );
      if (!repository) {
        return null;
      }
      if (repository.stargazers_count < minimumStars) {
        return null;
      }
      const pullRequests = items.map((item): ContributionPullRequest => {
        let state: PullRequestState = "Closed";
        if (item.pull_request?.merged_at) {
          state = "Merged";
        } else if (item.state === "open") {
          state = "Open";
        }
        return {
          title: item.title,
          state,
          number: item.number,
          url: item.html_url,
        };
      });
      return {
        name: repository.full_name.split("/").at(-1) ?? repository.full_name,
        repo: repository.full_name,
        stars: repository.stargazers_count,
        url: `https://github.com/${repository.full_name}`,
        pullRequests,
      } satisfies ContributionRepository;
    })
  );
  return contributionData
    .flatMap((repository) => (repository ? [repository] : []))
    .toSorted((first, second) => second.stars - first.stars);
};

/** Loads cached GitHub pull request contributions. */
export const getContributions = createServerFn({ method: "GET" }).handler(
  async () => {
    if (cachedContributions && Date.now() - cachedAt < cacheDuration) {
      return cachedContributions;
    }
    try {
      cachedContributions = await fetchContributions();
      cachedAt = Date.now();
    } catch {
      if (!cachedContributions) {
        return [];
      }
    }
    return cachedContributions ?? [];
  }
);
