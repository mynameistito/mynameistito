/** Repository fields used to select public, non-fork projects. */
export interface RepositoryVisibility {
  readonly fork: boolean;
  readonly name: string;
  readonly private: boolean;
}

/** A repository in the portfolio order and whether it is featured. */
export interface OrderedProjectRepository<T extends RepositoryVisibility> {
  readonly featured: boolean;
  readonly repository: T;
}

/** Extracts the unique pinned repository names from GitHub profile markup.
 * @param html - The untrusted GitHub profile page HTML.
 * @param username - The GitHub account whose pinned repositories to read.
 * @returns Up to six repository names in pin order, or `null` when pin markup is absent.
 */
export const readPinnedRepositoryNames = (
  html: string,
  username: string
): readonly string[] | null => {
  const escapedUsername = username.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const repositoryHref = new RegExp(
    `href="/${escapedUsername}/(?<name>[^"/]+)"`,
    "u"
  );
  const matches = html.matchAll(
    /<li\b[^>]*\bpinned-item-list-item\b[^>]*>(?<item>[\s\S]*?)<\/li>/gu
  );
  const names: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const item = match.groups?.item;
    const name = item?.match(repositoryHref)?.groups?.name;
    if (name && !seen.has(name)) {
      names.push(name);
      seen.add(name);
    }
    if (names.length === 6) {
      break;
    }
  }

  return names.length > 0 ? names : null;
};

/** Put pinned public repositories first, then include remaining owned repos.
 * @typeParam T - The repository metadata type.
 * @param repositories - Repositories returned by GitHub.
 * @param pinnedNames - Repository names in GitHub pin order.
 * @returns Public non-fork repositories with the first three pins featured.
 */
export const orderProjectRepositories = <T extends RepositoryVisibility>(
  repositories: readonly T[],
  pinnedNames: readonly string[]
): readonly OrderedProjectRepository<T>[] => {
  const publicRepositories = repositories.filter(
    (repository) => !repository.fork && !repository.private
  );
  const repositoriesByName = new Map(
    publicRepositories.map((repository) => [repository.name, repository])
  );
  const pinnedRepositories: T[] = [];
  const includedNames = new Set<string>();

  for (const name of pinnedNames) {
    const repository = repositoriesByName.get(name);
    if (repository && !includedNames.has(name)) {
      pinnedRepositories.push(repository);
      includedNames.add(name);
    }
  }

  return [
    ...pinnedRepositories.map((repository, index) => ({
      featured: index < 3,
      repository,
    })),
    ...publicRepositories
      .filter((repository) => !includedNames.has(repository.name))
      .map((repository) => ({ featured: false, repository })),
  ];
};
