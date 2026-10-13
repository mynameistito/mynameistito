import { Schema } from "effect";

/** A failed Tokscale HTTP request or invalid response payload. */
// oxlint-disable-next-line unicorn/throw-new-error -- SAFETY: Effect Schema.TaggedError is extended as required by the tagged-error API.
export class TokscaleRequestError extends Schema.TaggedError<TokscaleRequestError>()(
  "TokscaleRequestError",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  }
) {}
