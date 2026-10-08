import {
  GithubProtocol,
  credentials,
  repos,
  search,
} from "@distilled.cloud/github";
import type { GithubOpContext } from "@distilled.cloud/github";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

import { GitHubRequestError } from "@/lib/provider/github/errors";

export { GitHubRequestError } from "@/lib/provider/github/errors";

const githubUserAgent = "portfolio-website";

interface GitHubLayerConfig {
  readonly username: string;
  readonly token?: Redacted.Redacted<string>;
}

const runGitHubSdk = <A, E>(
  token: string,
  operation: Effect.Effect<A, E, GithubOpContext>
) =>
  Effect.provide(
    operation,
    Layer.mergeAll(
      FetchHttpClient.layer,
      credentials({ token, userAgent: githubUserAgent }),
      GithubProtocol
    )
  ).pipe(
    Effect.mapError(
      (cause) => new GitHubRequestError({ operation: "rest", cause })
    )
  );

/** GitHub repository record needed by the website. */
export interface Repository {
  readonly name: string;
  readonly full_name: string;
  readonly html_url: string;
  readonly description: string | null;
  readonly language?: string | null;
  readonly homepage?: string | null;
  readonly fork: boolean;
  readonly private: boolean;
}

/** Pull-request search result fields used by the contribution browser. */
export interface PullRequestSearchItem {
  readonly title: string;
  readonly number: number;
  readonly state: string;
  readonly html_url: string;
  readonly repository_url: string;
  readonly pull_request?: { readonly merged_at?: string | null };
}

/** GitHub profile and yearly contribution data used by the footer preview. */
export interface Profile {
  readonly name: string;
  readonly handle: string;
  readonly avatarUrl: string;
  readonly followers: number;
  readonly following: number;
  readonly totalContributions: number;
  readonly weeks: readonly (readonly number[])[];
  readonly organizations: readonly {
    readonly name: string;
    readonly avatarUrl: string;
  }[];
}

const RepositorySchema = Schema.Struct({
  name: Schema.String,
  full_name: Schema.String,
  html_url: Schema.String,
  description: Schema.NullOr(Schema.String),
  language: Schema.optional(Schema.NullOr(Schema.String)),
  homepage: Schema.optional(Schema.NullOr(Schema.String)),
  fork: Schema.Boolean,
  private: Schema.Boolean,
});

const SearchItemSchema = Schema.Struct({
  title: Schema.String,
  number: Schema.Int,
  state: Schema.String,
  html_url: Schema.String,
  repository_url: Schema.String,
  pull_request: Schema.optional(
    Schema.Struct({ merged_at: Schema.optional(Schema.NullOr(Schema.String)) })
  ),
});

const SearchResponseSchema = Schema.Struct({
  items: Schema.Array(SearchItemSchema),
});

const RepositoryDetailSchema = Schema.Struct({
  full_name: Schema.String,
  stargazers_count: Schema.Int,
});

const ContributionLevelSchema = Schema.Literals([
  "NONE",
  "FIRST_QUARTILE",
  "SECOND_QUARTILE",
  "THIRD_QUARTILE",
  "FOURTH_QUARTILE",
]);

const GitHubProfileResponseSchema = Schema.Struct({
  data: Schema.Struct({
    user: Schema.NullOr(
      Schema.Struct({
        login: Schema.String,
        name: Schema.NullOr(Schema.String),
        avatarUrl: Schema.String,
        followers: Schema.Struct({ totalCount: Schema.Int }),
        following: Schema.Struct({ totalCount: Schema.Int }),
        organizations: Schema.Struct({
          nodes: Schema.Array(
            Schema.Struct({ login: Schema.String, avatarUrl: Schema.String })
          ),
        }),
        contributionsCollection: Schema.Struct({
          contributionCalendar: Schema.Struct({
            totalContributions: Schema.Int,
            weeks: Schema.Array(
              Schema.Struct({
                contributionDays: Schema.Array(
                  Schema.Struct({ contributionLevel: ContributionLevelSchema })
                ),
              })
            ),
          }),
        }),
      })
    ),
  }),
});

const levelToNumber = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
} as const;

type GitHubUser = Exclude<
  (typeof GitHubProfileResponseSchema)["Type"]["data"]["user"],
  null
>;

const toProfile = (user: GitHubUser): Profile => {
  const calendar = user.contributionsCollection.contributionCalendar;
  return {
    name: user.name ?? user.login,
    handle: user.login,
    avatarUrl: user.avatarUrl,
    followers: user.followers.totalCount,
    following: user.following.totalCount,
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks.map((week) =>
      week.contributionDays.map((day) => levelToNumber[day.contributionLevel])
    ),
    organizations: user.organizations.nodes.map((organization) => ({
      name: organization.login,
      avatarUrl: organization.avatarUrl,
    })),
  };
};

/** GitHub HTTP capabilities used by project, contribution, and profile queries. */
export class GitHub extends Context.Service<
  GitHub,
  {
    readonly listRepositories: (
      page: number,
      perPage: number
    ) => Effect.Effect<readonly Repository[], GitHubRequestError>;
    readonly profilePage: Effect.Effect<string, GitHubRequestError>;
    readonly searchPullRequests: Effect.Effect<
      readonly PullRequestSearchItem[],
      GitHubRequestError
    >;
    readonly repository: (
      owner: string,
      name: string
    ) => Effect.Effect<
      { readonly full_name: string; readonly stargazers_count: number },
      GitHubRequestError
    >;
    readonly profile: (
      login: string,
      from: string,
      to: string
    ) => Effect.Effect<Profile, GitHubRequestError>;
  }
>()("website/provider/GitHub") {
  /** Constructs the GitHub adapter with an optional API token.
   * @param config - The GitHub username and optional redacted API token.
   * @returns A layer with the HttpClient requirement still available.
   */
  static readonly layerWithoutDependencies = ({
    username,
    token,
  }: GitHubLayerConfig) =>
    Layer.effect(
      GitHub,
      Effect.gen(function* layerWithoutDependencies() {
        const baseHttpClient = yield* HttpClient.HttpClient;
        const apiClient = baseHttpClient.pipe(
          HttpClient.mapRequest((request) => {
            let withHeaders = HttpClientRequest.setHeader(
              request,
              "User-Agent",
              githubUserAgent
            );
            if (token) {
              withHeaders = HttpClientRequest.setHeader(
                withHeaders,
                "Authorization",
                `Bearer ${Redacted.value(token)}`
              );
            }
            return withHeaders;
          }),
          HttpClient.filterStatusOk
        );
        const profilePageClient = baseHttpClient.pipe(
          HttpClient.mapRequest((request) =>
            HttpClientRequest.setHeader(request, "User-Agent", githubUserAgent)
          ),
          HttpClient.filterStatusOk
        );

        const readJson = <S extends Schema.Constraint>(
          operation: string,
          schema: S,
          request: HttpClientRequest.HttpClientRequest
        ): Effect.Effect<
          S["Type"],
          GitHubRequestError,
          S["DecodingServices"]
        > =>
          apiClient.execute(request).pipe(
            Effect.flatMap(HttpClientResponse.schemaBodyJson(schema)),
            Effect.mapError(
              (cause) => new GitHubRequestError({ operation, cause })
            )
          );

        const listRepositories = Effect.fn("GitHub.listRepositories")(
          function* listRepositories(page: number, perPage: number) {
            if (token) {
              const repositories = yield* runGitHubSdk(
                Redacted.value(token),
                repos.listForUser({
                  username,
                  type: "owner",
                  per_page: perPage,
                  page,
                })
              );
              return repositories.map((repository) => ({
                name: repository.name,
                full_name: repository.full_name,
                html_url: repository.html_url,
                description: repository.description ?? null,
                language: repository.language,
                homepage: repository.homepage,
                fork: repository.fork,
                private: repository.private,
              }));
            }
            return yield* readJson(
              "listRepositories",
              Schema.Array(RepositorySchema),
              HttpClientRequest.get(
                `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&page=${page}&type=owner`
              )
            );
          }
        );
        const profilePage = profilePageClient
          .get(`https://github.com/${encodeURIComponent(username)}`)
          .pipe(
            Effect.flatMap((response) => response.text),
            Effect.mapError(
              (cause) =>
                new GitHubRequestError({ operation: "profilePage", cause })
            )
          );
        const searchPullRequests = Effect.fn("GitHub.searchPullRequests")(
          function* searchPullRequests() {
            if (token) {
              const response = yield* runGitHubSdk(
                Redacted.value(token),
                search.issuesAndPullRequests({
                  q: `author:${username} type:pr`,
                  per_page: 100,
                  sort: "updated",
                })
              );
              return response.items.map((item) => ({
                title: item.title,
                number: item.number,
                state: item.state,
                html_url: item.html_url,
                repository_url: item.repository_url,
                pull_request: item.pull_request
                  ? { merged_at: item.pull_request.merged_at }
                  : undefined,
              }));
            }
            const searchUrl = new URL("https://api.github.com/search/issues");
            searchUrl.searchParams.set("q", `author:${username} type:pr`);
            searchUrl.searchParams.set("per_page", "100");
            searchUrl.searchParams.set("sort", "updated");
            const result = yield* readJson(
              "searchPullRequests",
              SearchResponseSchema,
              HttpClientRequest.get(searchUrl.toString())
            );
            return result.items;
          }
        )();
        const repository = Effect.fn("GitHub.repository")(function* repository(
          owner: string,
          name: string
        ) {
          if (token) {
            const response = yield* runGitHubSdk(
              Redacted.value(token),
              repos.get({ owner, repo: name })
            );
            return {
              full_name: response.full_name,
              stargazers_count: response.stargazers_count,
            };
          }
          return yield* readJson(
            "repository",
            RepositoryDetailSchema,
            HttpClientRequest.get(
              `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`
            )
          );
        });
        const profile = Effect.fn("GitHub.profile")(function* profile(
          login: string,
          from: string,
          to: string
        ) {
          const response = yield* readJson(
            "profile",
            GitHubProfileResponseSchema,
            HttpClientRequest.post("https://api.github.com/graphql").pipe(
              HttpClientRequest.setHeader("Content-Type", "application/json"),
              HttpClientRequest.bodyJsonUnsafe({
                query: `query FooterProfile($login: String!, $from: DateTime!, $to: DateTime!) {
                    user(login: $login) {
                      login
                      name
                      avatarUrl
                      followers { totalCount }
                      following { totalCount }
                      organizations(first: 10) { nodes { login avatarUrl } }
                      contributionsCollection(from: $from, to: $to) {
                        contributionCalendar {
                          totalContributions
                          weeks { contributionDays { contributionLevel } }
                        }
                      }
                    }
                  }`,
                variables: { login, from, to },
              })
            )
          );
          const { user } = response.data;
          if (!user) {
            return yield* new GitHubRequestError({
              operation: "profile",
              cause: new Error("GitHub profile was not found."),
            });
          }
          return toProfile(user);
        });

        return GitHub.of({
          listRepositories,
          profilePage,
          searchPullRequests,
          repository,
          profile,
        });
      })
    );

  /** Provides the fetch-backed HttpClient for the GitHub adapter.
   * @param config - The GitHub username and optional redacted API token.
   * @returns A fully assembled GitHub provider layer.
   */
  static readonly layer = (config: GitHubLayerConfig) =>
    GitHub.layerWithoutDependencies(config).pipe(
      Layer.provide(FetchHttpClient.layer)
    );
}
