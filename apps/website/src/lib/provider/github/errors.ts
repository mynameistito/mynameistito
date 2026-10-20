import { Data, Effect } from "effect";
import { HttpClientError } from "effect/http";

/** A failed GitHub HTTP request or invalid response payload. */
export class GitHubRequestError extends Data.TaggedError("GitHubRequestError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

/**
 * Formats a GitHub request failure without exposing request credentials.
 *
 * @param error - The typed GitHub request failure.
 * @returns A safe, descriptive error message.
 */
export const formatGitHubRequestError = (error: GitHubRequestError): string => {
  let causeSummary: string;

  if (HttpClientError.isHttpClientError(error.cause)) {
    const responseStatus =
      "response" in error.cause.reason
        ? `HTTP ${error.cause.reason.response.status}: `
        : "";

    causeSummary = `${responseStatus}${error.cause.message}`;
  } else if (error.cause instanceof Error) {
    causeSummary = `${error.cause.name}: ${error.cause.message}`;
  } else {
    causeSummary = String(error.cause);
  }

  return `GitHub ${error.operation} failed: ${causeSummary}.`;
};

const mapGitHubRequestError = <E>(error: E | GitHubRequestError): E | Error =>
  error instanceof GitHubRequestError
    ? new Error(formatGitHubRequestError(error), { cause: error })
    : error;

/**
 * Maps GitHub request failures to descriptive errors at a runtime boundary.
 *
 * @param effect - The Effect whose GitHub request errors should be formatted.
 * @returns The Effect with GitHub request errors translated to descriptive errors.
 */
export const exposeGitHubRequestError = <A, E, R>(
  effect: Effect.Effect<A, E | GitHubRequestError, R>
): Effect.Effect<A, E | Error, R> =>
  effect.pipe(Effect.mapError(mapGitHubRequestError));
