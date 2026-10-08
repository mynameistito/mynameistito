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
