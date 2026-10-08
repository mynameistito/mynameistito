import {
  ChevronDown,
  ExternalLink,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
} from "lucide-react";
import { useMemo, useState } from "react";

import { SiteHeader } from "@/components/site-header";
import type {
  ContributionRepository,
  PullRequestState,
} from "@/lib/contributions";

interface OpenSourceBrowserProps {
  readonly repositories: readonly ContributionRepository[];
}

const pullRequestStates = ["All", "Open", "Merged", "Closed"] as const;
const pullRequestStatus = {
  Open: { Icon: GitPullRequest, color: "text-pr-open" },
  Merged: { Icon: GitMerge, color: "text-pr-merged" },
  Closed: { Icon: GitPullRequestClosed, color: "text-pr-closed" },
} satisfies Record<
  PullRequestState,
  { readonly Icon: typeof GitPullRequest; readonly color: string }
>;

const RepositoryAvatar = ({
  avatarUrl,
  name,
}: {
  readonly avatarUrl: string;
  readonly name: string;
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span className="grid size-[30px] shrink-0 place-items-center rounded-control border border-line-strong bg-surface-raised text-xs text-muted">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      alt={`${name} owner avatar`}
      className="size-[30px] shrink-0 rounded-control border border-line-strong bg-surface-raised object-cover"
      height="30"
      onError={() => setHasError(true)}
      src={avatarUrl}
      width="30"
    />
  );
};

/** Displays searchable external repositories and Tito's pull requests.
 * @param repositories - GitHub contribution repositories to display.
 * @returns The interactive contribution browser.
 */
export const OpenSourceBrowser = ({ repositories }: OpenSourceBrowserProps) => {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] =
    useState<(typeof pullRequestStates)[number]>("All");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRepositories = useMemo(
    () =>
      repositories
        .map((repository) => ({
          ...repository,
          pullRequests: repository.pullRequests.filter((pullRequest) => {
            const matchesState =
              stateFilter === "All" || pullRequest.state === stateFilter;
            const matchesQuery =
              !normalizedQuery ||
              `${repository.name} ${repository.repo} ${pullRequest.title} ${pullRequest.number}`
                .toLowerCase()
                .includes(normalizedQuery);
            return matchesState && matchesQuery;
          }),
        }))
        .filter((repository) => repository.pullRequests.length > 0),
    [normalizedQuery, repositories, stateFilter]
  );
  const pullRequestCount = repositories.reduce(
    (total, repository) => total + repository.pullRequests.length,
    0
  );
  const visiblePullRequestCount = filteredRepositories.reduce(
    (total, repository) => total + repository.pullRequests.length,
    0
  );
  const stateCount = (state: (typeof pullRequestStates)[number]) =>
    repositories.reduce(
      (total, repository) =>
        total +
        repository.pullRequests.filter(
          (pullRequest) => state === "All" || pullRequest.state === state
        ).length,
      0
    );

  return (
    <main className="page-shell pt-page-top-header pb-page-bottom">
      <SiteHeader backLabel="Portfolio" backTo="/" />
      <section className="mt-section">
        <h1 className="m-0 text-page-title font-semibold leading-tight tracking-title text-text">
          Open source
        </h1>
        <p className="mt-2 mb-0 text-base leading-6 text-muted">
          Contributions to the tools and communities I use.
        </p>
      </section>

      <section
        aria-labelledby="pull-requests-title"
        className="mt-7 border-t border-line pt-7"
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2
            className="m-0 text-base font-semibold text-text"
            id="pull-requests-title"
          >
            Pull requests
          </h2>
          <span className="text-xs text-muted">
            {pullRequestCount} pull requests
          </span>
        </div>
        <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label
            className="grid min-w-0 gap-1.5 text-micro leading-4 text-muted"
            htmlFor="contribution-search"
          >
            Search contributions
            <input
              autoComplete="off"
              className="h-[34px] min-w-0 rounded-control border border-line bg-surface px-2.5 text-xs text-text outline-none transition-colors placeholder:text-subtle focus:border-focus"
              id="contribution-search"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Title, repository, or pull request"
              type="search"
              value={query}
            />
          </label>
          <fieldset className="flex h-[34px] min-w-0 border-0 p-0">
            <legend className="sr-only">Filter by state</legend>
            {pullRequestStates.map((state) => (
              <button
                aria-pressed={stateFilter === state}
                className={`flex min-w-0 items-center gap-1 border border-line px-1.5 text-micro transition-colors first-of-type:rounded-l-control last:rounded-r-control ${stateFilter === state ? "bg-surface-raised text-text" : "bg-surface text-muted hover:text-text"}`}
                key={state}
                onClick={() => setStateFilter(state)}
                type="button"
              >
                {state} <span className="text-subtle">{stateCount(state)}</span>
              </button>
            ))}
          </fieldset>
        </div>
        <output
          aria-live="polite"
          className="mb-3 mt-2 block text-micro leading-4 text-muted"
        >
          {visiblePullRequestCount} of {pullRequestCount} pull requests
        </output>

        {filteredRepositories.length > 0 ? (
          <ul className="m-0 list-none border-t border-line p-0">
            {filteredRepositories.map((repository) => (
              <li className="border-b border-line" key={repository.repo}>
                <details className="group" open={normalizedQuery.length > 0}>
                  <summary className="flex min-h-[58px] cursor-pointer list-none items-center gap-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <RepositoryAvatar
                      avatarUrl={repository.avatarUrl}
                      name={repository.name}
                    />
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate text-xs font-semibold leading-4 text-text">
                        {repository.name}
                      </span>
                      <span className="truncate text-micro leading-4 text-muted">
                        {repository.repo}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-micro text-muted sm:inline">
                      ★ {repository.stars.toLocaleString()}
                    </span>
                    <span className="shrink-0 text-micro text-muted">
                      {repository.pullRequests.length} PR
                      {repository.pullRequests.length === 1 ? "" : "s"}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="shrink-0 text-subtle transition-transform group-open:rotate-180"
                      size={14}
                    />
                  </summary>
                  <div className="pl-10">
                    <div className="-ml-10 border-b border-line pl-4">
                      <a
                        className="inline-flex min-h-10 items-center text-micro text-muted transition-colors hover:text-text"
                        href={repository.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open repository
                        <ExternalLink
                          aria-hidden="true"
                          className="ml-1"
                          size={12}
                        />
                      </a>
                    </div>
                    {repository.pullRequests.map((pullRequest) => {
                      const { Icon, color } =
                        pullRequestStatus[pullRequest.state];
                      return (
                        <article
                          className="-ml-10 grid min-h-10 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-line py-2 last:border-0"
                          key={pullRequest.number}
                        >
                          <a
                            className="inline-flex min-w-0 items-center gap-1.5 text-small leading-4 text-text transition-colors hover:text-accent"
                            href={pullRequest.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <Icon
                              aria-hidden="true"
                              className={`shrink-0 ${color}`}
                              size={14}
                              strokeWidth={1.75}
                            />
                            {pullRequest.title}
                          </a>
                          <span className={`text-micro ${color}`}>
                            {pullRequest.state}
                          </span>
                          <span className="text-micro text-subtle">
                            #{pullRequest.number}
                          </span>
                        </article>
                      );
                    })}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 border-t border-line py-5 text-sm text-muted">
            No pull requests match “{query}”. Try another search or state.
          </p>
        )}
      </section>
    </main>
  );
};
