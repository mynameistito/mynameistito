import { Data } from "effect";

/** A failed Tokscale HTTP request or invalid response payload. */
export class TokscaleRequestError extends Data.TaggedError(
  "TokscaleRequestError"
)<{
  readonly operation: string;
  readonly cause: unknown;
}> {}
