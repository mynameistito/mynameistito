import { Schema } from "effect";

/** A failed MDFromX HTTP request or invalid response payload. */
// oxlint-disable-next-line unicorn/throw-new-error -- SAFETY: Effect Schema.TaggedError is a class factory and must be extended without `new`.
export class MDFromXRequestError extends Schema.TaggedError<MDFromXRequestError>()(
  "MDFromXRequestError",
  {
    operation: Schema.String,
    cause: Schema.Defect(),
  }
) {}
