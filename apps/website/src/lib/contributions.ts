import { DateTime, Effect, Redacted } from "effect";

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
  readonly name: string;
  readonly repo: string;
  readonly stars: number;
  readonly url: string;
  readonly pullRequests: readonly ContributionPullRequest[];
}

const cacheDuration = 24 * 60 * 60 * 1000;
const minimumStars = 1000;
let cachedAt = 0;
let cachedContributions: readonly ContributionRepository[] | undefined;

const fetchContributionRepositories = Effect.gen(
  function* fetchContributionRepositories() {
    const github = yield* GitHub;
    const searchResults = yield* github.searchPullRequests;
    const groups = new Map<string, typeof searchResults>();
    for (const item of searchResults) {
      const group = groups.get(item.repository_url) ?? [];
      groups.set(item.repository_url, [...group, item]);
    }

    const results = [...groups.entries()].slice(0, 40);
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
            name:
              repository.full_name.split("/").at(-1) ?? repository.full_name,
            repo: repository.full_name,
            stars: repository.stargazers_count,
            url: `https://github.com/${repository.full_name}`,
            pullRequests,
          } satisfies ContributionRepository;
        })
      ),
      { concurrency: "unbounded" }
    );
    const repositories = contributionData.flatMap((repository) =>
      repository === null ? [] : [repository]
    );
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
    const env = yield* Effect.promise(() => getAppEnv());
    return yield* fetchContributionRepositories.pipe(
      Effect.provide(
        GitHub.layer({
          username: profile.github,
          token: env.GITHUB_TOKEN ? Redacted.make(env.GITHUB_TOKEN) : undefined,
        })
      ),
      Effect.tap((contributions) =>
        Effect.sync(() => {
          cachedContributions = contributions;
          cachedAt = now.epochMilliseconds;
        })
      ),
      Effect.catchTag("GitHubRequestError", (error) => {
        console.error("Failed to load GitHub contributions.", error._tag);
        return Effect.succeed(cachedContributions ?? []);
      })
    );
  }
);
