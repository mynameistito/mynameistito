import { Schema } from "effect";

/** A failed GitHub HTTP request or invalid response payload. */
// oxlint-disable-next-line unicorn/throw-new-error -- SAFETY: Effect Schema.TaggedError is a class factory and must be extended without `new`.
export class GitHubRequestError extends Schema.TaggedError<GitHubRequestError>()(
  "GitHubRequestError",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  }
) {}
