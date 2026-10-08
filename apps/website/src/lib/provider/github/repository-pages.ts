import { Effect } from "effect";

const repositoriesPerPage = 100;

/** Collects all pages using an Effect-returning GitHub page loader.
 * @typeParam T - The repository record returned from GitHub.
 * @typeParam E - The failure produced by one page request.
 * @param fetchPage - Loads one page with its page number and page size.
 * @returns Every record in page order.
 */
export const collectRepositoryPages = <T, E, R>(
  fetchPage: (
    page: number,
    perPage: number
  ) => Effect.Effect<readonly T[], E, R>
): Effect.Effect<readonly T[], E, R> => {
  const collectPage = Effect.fnUntraced(function* collectPage(
    page: number
  ): Effect.fn.Return<readonly T[], E, R> {
    const results = yield* fetchPage(page, repositoriesPerPage);
    if (results.length < repositoriesPerPage) {
      return results;
    }
    return [...results, ...(yield* collectPage(page + 1))];
  });

  return collectPage(1);
};
