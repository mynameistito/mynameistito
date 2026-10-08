import {
  GithubProtocol,
  credentials,
  repos,
  search,
} from "@distilled.cloud/github";
import type { GithubOpContext } from "@distilled.cloud/github";
import { provide, runPromise } from "effect/Effect";
import type { Effect as EffectType } from "effect/Effect";
import { layer as fetchHttpClientLayer } from "effect/http/FetchHttpClient";
import { mergeAll } from "effect/Layer";

/** Runs a generated GitHub operation with the shared Effect-native protocol.
 * @param token - A GitHub API token.
 * @param operation - A generated SDK operation.
 * @returns The operation result.
 */
export const runGitHub = <A, E>(
  token: string,
  operation: EffectType<A, E, GithubOpContext>
): Promise<A> =>
  runPromise(
    provide(
      operation,
      mergeAll(
        fetchHttpClientLayer,
        credentials({ token, userAgent: "mynameistito-portfolio" }),
        GithubProtocol
      )
    )
  );

/** Generated repository-list endpoint used when a GitHub token is configured. */
export const listUserRepositories = repos.listForUser;

/** Generated issue and pull-request search endpoint. */
export const searchIssuesAndPullRequests = search.issuesAndPullRequests;

/** Generated repository-detail endpoint. */
export const getRepository = repos.get;
