import { Schema } from "effect";

type DependencyMap = Record<string, string>;

/** Required and commonly used npm package manifest fields. */
export interface PackageManifest {
  readonly name: string;
  readonly version: string;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
}

const DependencyMapSchema = Schema.Record(Schema.String, Schema.String);

const PackageManifestSchema = Schema.StructWithRest(
  Schema.Struct({
    dependencies: Schema.optional(DependencyMapSchema),
    devDependencies: Schema.optional(DependencyMapSchema),
    name: Schema.String,
    optionalDependencies: Schema.optional(DependencyMapSchema),
    peerDependencies: Schema.optional(DependencyMapSchema),
    version: Schema.String,
  }),
  [Schema.Record(Schema.String, Schema.Unknown)]
);

/** Parses required package fields while retaining publication metadata.
 * @param input - Serialized package manifest JSON.
 * @returns The validated package manifest, including unmodeled fields.
 */
export const parsePackageManifest = Schema.decodeUnknownSync(
  Schema.fromJsonString(PackageManifestSchema)
);
