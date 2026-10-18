import { Data } from "effect";

/** A failed GitHub HTTP request or invalid response payload. */
export class GitHubRequestError extends Data.TaggedError("GitHubRequestError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}
