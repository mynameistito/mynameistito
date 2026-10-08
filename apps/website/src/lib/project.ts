/** GitHub repository metadata displayed as a portfolio project. */
export interface Project {
  readonly name: string;
  readonly description: string;
  readonly languages: readonly string[];
  readonly image: string;
  readonly featured: boolean;
  readonly source: string;
  readonly demo?: string;
  readonly readme?: string;
}

/** Returns a stable URL-safe route segment for a project.
 * @param name - The GitHub repository name.
 * @returns The URL-safe project route segment.
 */
export const projectSlug = (name: string) =>
  name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "-");
