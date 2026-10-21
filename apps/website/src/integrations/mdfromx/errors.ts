import { Data } from "effect";

/** A failed MDFromX HTTP request or invalid response payload. */
export class MDFromXRequestError extends Data.TaggedError(
  "MDFromXRequestError"
)<{
  readonly operation: string;
  readonly cause: unknown;
}> {}
