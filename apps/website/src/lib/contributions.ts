import { DateTime, Effect, Schema } from "effect";
import { HttpClientError } from "effect/http";

import { getAppEnv } from "@/env";
import type { AppEnv } from "@/env";
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

const ContributionPullRequestSchema = Schema.Struct({
  title: Schema.String,
  state: Schema.Literals(["Open", "Merged", "Closed"]),
  number: Schema.Int,
  url: Schema.String,
});

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

const ContributionRepositorySchema = Schema.Struct({
  featured: Schema.Boolean,
  name: Schema.String,
  repo: Schema.String,
  stars: Schema.Int,
  url: Schema.String,
  avatarUrl: Schema.String,
  pullRequests: Schema.Array(ContributionPullRequestSchema),
});

/** Last successfully refreshed contribution data. */
interface ContributionSnapshot {
  readonly refreshedAt: string;
  readonly repositories: readonly ContributionRepository[];
}

const ContributionSnapshotSchema = Schema.Struct({
  refreshedAt: Schema.String,
  repositories: Schema.Array(ContributionRepositorySchema),
});

const snapshotKey = "open-source:contributions:v1";
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

const startBootstrapRefresh = Effect.fn("startBootstrapRefresh")(
  function* startBootstrapRefresh(env: AppEnv) {
    const refresh = env.CONTRIBUTIONS_REFRESH;
    if (!refresh) {
      return;
    }
    const now = yield* DateTime.now;
    const day = Math.floor(now.epochMilliseconds / 86_400_000);
    const result = yield* Effect.result(
      Effect.tryPromise({
        try: () =>
          refresh.create({
            id: `contributions-bootstrap-${day}`,
            params: {},
          }),
        catch: (cause) =>
          cause instanceof Error
            ? cause
            : new Error("Workflow start failed", { cause }),
      })
    );
    if (result._tag === "Failure") {
      console.warn(
        "[open-source] Unable to start the initial refresh workflow."
      );
    }
  }
);

/** Loads the last successfully published GitHub contribution snapshot. */
export const loadContributions = Effect.fn("loadContributions")(
  function* loadContributions(bindings?: AppEnv) {
    const env = bindings ?? (yield* getAppEnv());
    const kv = env.OPEN_SOURCE_KV;
    if (!kv) {
      console.error("[open-source] The KV snapshot binding is not configured.");
      return [];
    }

    const stored = yield* Effect.result(
      Effect.tryPromise({
        try: () => kv.get(snapshotKey, "text"),
        catch: (cause) =>
          cause instanceof Error
            ? cause
            : new Error("KV read failed", { cause }),
      })
    );
    if (stored._tag === "Failure") {
      console.error("[open-source] Unable to read the contribution snapshot.");
      return [];
    }
    const snapshotText = stored.success;
    if (snapshotText === null) {
      yield* startBootstrapRefresh(env);
      return [];
    }

    const decoded = yield* Effect.result(
      Effect.try({
        try: () => JSON.parse(snapshotText),
        catch: (cause) =>
          cause instanceof Error
            ? cause
            : new Error("Invalid snapshot JSON", { cause }),
      }).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(ContributionSnapshotSchema))
      )
    );
    if (decoded._tag === "Failure") {
      console.error("[open-source] The contribution snapshot is invalid.");
      return [];
    }
    return decoded.success.repositories;
  }
);

/** Fetches GitHub contributions and publishes a complete KV snapshot. */
export const refreshContributions = Effect.fn("refreshContributions")(
  function* refreshContributions(env: AppEnv) {
    const kv = env.OPEN_SOURCE_KV;
    if (!kv) {
      return yield* Effect.fail(
        new Error("The open-source KV binding is not configured.")
      );
    }

    const repositories = yield* fetchContributionRepositories.pipe(
      Effect.provide(
        GitHub.layer({
          username: profile.github,
          token: env.GITHUB_TOKEN,
        })
      ),
      Effect.catchTag("GitHubRequestError", (error) => {
        console.error(
          `[open-source] GitHub ${error.operation} failed: ${summarizeGitHubFailure(error.cause)}.`
        );
        return Effect.fail(error);
      })
    );
    const now = yield* DateTime.now;
    const snapshot: ContributionSnapshot = {
      refreshedAt: DateTime.formatIso(now),
      repositories,
    };
    yield* Effect.tryPromise({
      try: () => kv.put(snapshotKey, JSON.stringify(snapshot)),
      catch: (cause) =>
        cause instanceof Error
          ? cause
          : new Error("Unable to write the open-source snapshot.", { cause }),
    });
    return {
      refreshedAt: snapshot.refreshedAt,
      repositoryCount: repositories.length,
    };
  }
);
