import { Schema } from "effect";

/** A failed npm registry request or invalid response payload. */
// oxlint-disable-next-line unicorn/throw-new-error -- SAFETY: Effect Schema.TaggedError is a class factory and must be extended without `new`.
export class NpmRegistryError extends Schema.TaggedError<NpmRegistryError>()(
  "NpmRegistryError",
  {
    cause: Schema.Defect(),
  }
) {}
