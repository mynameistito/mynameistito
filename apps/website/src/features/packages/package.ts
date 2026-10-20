/** Public npm package metadata displayed on the packages page. */
export interface NpmPackage {
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly weeklyDownloads: number;
  readonly npmUrl: string;
  readonly repositoryUrl?: string;
}
