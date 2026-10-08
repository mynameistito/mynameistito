import { DateTime, Effect } from "effect";
import { HttpClientError } from "effect/http";

import { getAppEnv } from "@/env";
import { profile } from "@/lib/profile";
import { GitHub } from "@/lib/provider/github/client";

/** Pull request lifecycle states shown in the open-source browser. */
export type PullRequestState = "Open" | "Merged" | "Closed";

/** A pull request Tito authored in an external repository. */
interface ContributionPullRequest {
  readonly title: string;
  readonly state: PullRequestState;
  readonly number: number;
  readonly url: string;
}

/** Repository and pull requests included in the contribution browser. */
export interface ContributionRepository {
  readonly featured: boolean;
  readonly name: string;
  readonly repo: string;
  readonly stars: number;
  readonly url: string;
  readonly avatarUrl: string;
  readonly pullRequests: readonly ContributionPullRequest[];
}

const cacheDuration = 60 * 60 * 1000;
const minimumStars = 1000;
// Set featured: true for a full GitHub slug, e.g. "owner/repo".
const repositoryOverrides = new Map<
  string,
  { readonly featured?: boolean; readonly ignored?: boolean }
>([
  // Featured repositories.
  ["anomalyco/opencode", { featured: true }],
  ["cloudflare/cloudflare-docs", { featured: true }],
  ["haydenbleasel/blume", { featured: true }],
  ["haydenbleasel/ultracite", { featured: true }],
  // Add ignored repositories here as ["owner/repo", { ignored: true }].
]);
let cachedAt = 0;
let cachedContributions: readonly ContributionRepository[] | undefined;

const summarizeGitHubFailure = (cause: unknown): string => {
  if (HttpClientError.isHttpClientError(cause)) {
    const responseStatus =
      "response" in cause.reason
        ? `HTTP ${cause.reason.response.status}: `
        : "";
    return `${responseStatus}${cause.message}`;
  }
  if (cause instanceof Error) {
    return `${cause.name}: ${cause.message}`;
  }
  return String(cause);
};

const fetchContributionRepositories = Effect.gen(
  function* fetchContributionRepositories() {
    const github = yield* GitHub;
    const searchResults = yield* github.searchPullRequests;
    const groups = new Map<string, typeof searchResults>();
    for (const item of searchResults) {
      const group = groups.get(item.repository_url) ?? [];
      groups.set(item.repository_url, [...group, item]);
    }

    const results = [...groups.entries()];
    const contributionData = yield* Effect.all(
      results.map(([repositoryUrl, items]) =>
        Effect.gen(function* loadContributionRepository() {
          const [owner, name] = new URL(repositoryUrl).pathname
            .split("/")
            .filter(Boolean)
            .slice(-2);
          if (!(owner && name)) {
            return null;
          }
          const repository = yield* github
            .repository(owner, name)
            .pipe(
              Effect.catchTag("GitHubRequestError", () => Effect.succeed(null))
            );
          if (!repository || repository.stargazers_count < minimumStars) {
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
            featured:
              repositoryOverrides.get(repository.full_name.toLowerCase())
                ?.featured ?? false,
            name:
              repository.full_name.split("/").at(-1) ?? repository.full_name,
            repo: repository.full_name,
            stars: repository.stargazers_count,
            url: `https://github.com/${repository.full_name}`,
            avatarUrl: repository.owner_avatar_url,
            pullRequests,
          } satisfies ContributionRepository;
        })
      ),
      { concurrency: 10 }
    );
    const repositories = contributionData.flatMap((repository) => {
      if (
        repository === null ||
        repositoryOverrides.get(repository.repo.toLowerCase())?.ignored
      ) {
        return [];
      }
      return [repository];
    });
    return repositories.toSorted((first, second) => second.stars - first.stars);
  }
);

/** Loads cached GitHub pull-request contributions. */
export const loadContributions = Effect.fn("loadContributions")(
  function* fetchContributions() {
    const now = yield* DateTime.now;
    if (
      cachedContributions &&
      now.epochMilliseconds - cachedAt < cacheDuration
    ) {
      return cachedContributions;
    }
    const env = yield* getAppEnv();
    return yield* fetchContributionRepositories.pipe(
      Effect.provide(
        GitHub.layer({
          username: profile.github,
          token: env.GITHUB_TOKEN,
        })
      ),
      Effect.tap((contributions) =>
        Effect.sync(() => {
          cachedContributions = contributions;
          cachedAt = now.epochMilliseconds;
        })
      ),
      Effect.catchTag("GitHubRequestError", (error) => {
        console.error(
          `[open-source] GitHub ${error.operation} failed: ${summarizeGitHubFailure(error.cause)}. Returning ${cachedContributions ? "cached contributions" : "no contributions (cache empty)"}.`
        );
        return Effect.succeed(cachedContributions ?? []);
      })
    );
  }
);
