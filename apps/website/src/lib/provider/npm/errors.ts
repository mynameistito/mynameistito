import { Data } from "effect";

/** A failed npm registry request or invalid response payload. */
export class NpmRegistryError extends Data.TaggedError("NpmRegistryError")<{
  readonly cause: unknown;
}> {}
