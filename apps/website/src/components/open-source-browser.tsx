import {
  IconExternalLink,
  IconGitMerge,
  IconGitPullRequest,
  IconGitPullRequestClosed,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { SiteHeader } from "@/components/site-header";

const assetBase = "/paper-assets";

type PullRequestState = "Open" | "Merged" | "Closed";

interface PullRequest {
  readonly title: string;
  readonly state: PullRequestState;
  readonly number: number;
}

interface Repository {
  readonly name: string;
  readonly repo: string;
  readonly stars: string;
  readonly image: string;
  readonly pullRequests: readonly PullRequest[];
}

const repositories: readonly Repository[] = [
  {
    name: "HyperFrames",
    repo: "heygen-com/hyperframes",
    stars: "58,155",
    image: "71RASVRXFP2YGBJEHBAHPYX3TR.png",
    pullRequests: [
      {
        title: "fix(studio): preserve authored caption groups on import",
        state: "Open",
        number: 3900,
      },
      {
        title: "feat(registry): add caret swap text effect",
        state: "Open",
        number: 3898,
      },
      {
        title: "fix(studio): preserve caption text when parsing transcripts",
        state: "Open",
        number: 3896,
      },
      {
        title: "feat(studio): add a preview volume control",
        state: "Merged",
        number: 3282,
      },
      {
        title: "feat(registry): add kinetic center build component",
        state: "Merged",
        number: 3269,
      },
      {
        title: "fix(catalog): sync tab labels with the sliding indicator",
        state: "Merged",
        number: 3267,
      },
      {
        title: "fix(registry): clear flowchart selection after click-away",
        state: "Merged",
        number: 3262,
      },
      {
        title: "fix(catalog): restore the caption texture preview",
        state: "Merged",
        number: 3258,
      },
      {
        title: "fix(catalog): center the menu morph preview",
        state: "Merged",
        number: 3256,
      },
      {
        title: "fix(catalog): keep the text stagger preview inside the frame",
        state: "Merged",
        number: 3255,
      },
      {
        title: "fix(catalog): keep the animated bar chart preview in frame",
        state: "Merged",
        number: 3254,
      },
      {
        title: "fix(catalog): keep the typewriter preview inside the frame",
        state: "Merged",
        number: 3249,
      },
    ],
  },
  {
    name: "Omarchy",
    repo: "omacom/omarchy",
    stars: "44,145",
    image: "65HVBPGYC2SFE9VSGFR38NMRWM.png",
    pullRequests: [
      {
        title: "Fix DaVinci Resolve Download Manager focus lock",
        state: "Open",
        number: 11_269,
      },
      {
        title: "Erase old password hashes during factory reset",
        state: "Merged",
        number: 10_379,
      },
      {
        title: "Stop DaVinci Resolve dialogs from recapturing pointer focus",
        state: "Merged",
        number: 6919,
      },
      {
        title: "fix(shell): reload only the changed local plugin",
        state: "Closed",
        number: 6785,
      },
      {
        title: "Recover the wallpaper picker after interrupted thumbnails",
        state: "Merged",
        number: 6775,
      },
      {
        title: "Fix DaVinci Resolve focus lock",
        state: "Closed",
        number: 5926,
      },
    ],
  },
  {
    name: "T3 Code",
    repo: "pingdotgg/t3code",
    stars: "25,971",
    image: "1H4A1TRND6EZ06JYHVGKPKWKYR.png",
    pullRequests: [
      {
        title: "fix(server): select linked files when revealing on Linux",
        state: "Open",
        number: 14_044,
      },
      {
        title: "fix(desktop): restore SnapShot shortcuts after portal restarts",
        state: "Open",
        number: 11_495,
      },
      {
        title: "fix(desktop): accept existing Hyprland SnapShot shortcuts",
        state: "Open",
        number: 10_658,
      },
      {
        title:
          "fix(desktop): remove oversized bars from Hyprland SnapShot animations",
        state: "Open",
        number: 10_646,
      },
      {
        title: "perf(web): speed up folder menu sorting",
        state: "Merged",
        number: 10_190,
      },
      {
        title: "feat(web): send prompts to new threads with Alt+Enter",
        state: "Closed",
        number: 6550,
      },
      {
        title: "fix(web): keep floating preview anchored after panel closes",
        state: "Merged",
        number: 6547,
      },
      {
        title: "fix(codex): keep background memory out of chats",
        state: "Merged",
        number: 5468,
      },
      {
        title: "fix(web): preserve POSIX path casing in file links",
        state: "Closed",
        number: 4805,
      },
    ],
  },
  {
    name: "OpenCode",
    repo: "anomalyco/opencode",
    stars: "212,109",
    image: "2NNAKS92CEBF42T0HZHGGMDMZ0.png",
    pullRequests: [
      {
        title: "fix(tui): make question footer actions clickable",
        state: "Closed",
        number: 17_096,
      },
      {
        title: "fix(tui): make new-session prompt handoff deterministic",
        state: "Open",
        number: 14_484,
      },
      { title: "fix: cli logo output", state: "Closed", number: 12_575 },
      {
        title: "feat(tui): highlight esc label on hover in dialog",
        state: "Merged",
        number: 12_383,
      },
      {
        title: 'fix(tui): allow mouse escape via "esc" labels in dialogs',
        state: "Merged",
        number: 11_421,
      },
      {
        title: "feat: add version to session header and /status dialog",
        state: "Merged",
        number: 8802,
      },
      {
        title: "fix: open help dialog with tui/open-help route",
        state: "Merged",
        number: 8596,
      },
      {
        title: "feat: add project navigation to /session dialog in TUI",
        state: "Closed",
        number: 8542,
      },
      {
        title: "feat: show connected providers in /connect dialog",
        state: "Merged",
        number: 8351,
      },
    ],
  },
  {
    name: "Diffusion Studio",
    repo: "diffusionstudio/editor",
    stars: "3,237",
    image: "6KN2TM55ZWZ6B4QG0D3AQQ8MCE.png",
    pullRequests: [
      {
        title: "Fix stale timeline previews after replacing a clip source",
        state: "Open",
        number: 87,
      },
    ],
  },
  {
    name: "Flea",
    repo: "thisisgm/flea",
    stars: "720",
    image: "4BZ0JWMZZCF5F4643XG8BT9CFP.png",
    pullRequests: [
      {
        title: "fix: reveal clipped menu labels on hover",
        state: "Open",
        number: 214,
      },
      {
        title: "feat: copy the selected file path with Ctrl+Shift+C",
        state: "Open",
        number: 188,
      },
      {
        title: "feat: mute audio and video previews",
        state: "Closed",
        number: 142,
      },
      {
        title: "fix: prevent adding the same folder to Favorites twice",
        state: "Closed",
        number: 139,
      },
      {
        title: "fix: open the folder menu from Places",
        state: "Closed",
        number: 137,
      },
    ],
  },
  {
    name: "OpenTUI",
    repo: "anomalyco/opentui",
    stars: "13,489",
    image: "2NNAKS92CEBF42T0HZHGGMDMZ0.png",
    pullRequests: [
      {
        title: "fix(core): allow removing renderables across module copies",
        state: "Open",
        number: 1535,
      },
    ],
  },
  {
    name: "Effect",
    repo: "Effect-TS/effect",
    stars: "17,128",
    image: "75CTBX1PAT3C29VQMFS28N4WRW.png",
    pullRequests: [
      {
        title: "fix(ai-openrouter): accept rounded decision probabilities",
        state: "Closed",
        number: 8402,
      },
    ],
  },
  {
    name: "awesome-ratatui",
    repo: "ratatui/awesome-ratatui",
    stars: "2,036",
    image: "2PZQAA7RH9Y27RXXFC3EDA2J27.png",
    pullRequests: [{ title: "Add blippy", state: "Merged", number: 241 }],
  },
  {
    name: "Ralphy",
    repo: "michaelshimeles/ralphy",
    stars: "2,977",
    image: "4PX42DY0P5P1XMWRFWAYD7TA7K.png",
    pullRequests: [
      {
        title: "feat: add --json flag for json PRD support",
        state: "Merged",
        number: 84,
      },
    ],
  },
];

const pullRequestStates = ["All", "Open", "Merged", "Closed"] as const;
const pullRequestStatus = {
  Open: { Icon: IconGitPullRequest, color: "text-pr-open" },
  Merged: { Icon: IconGitMerge, color: "text-pr-merged" },
  Closed: { Icon: IconGitPullRequestClosed, color: "text-pr-closed" },
} satisfies Record<
  PullRequestState,
  { readonly Icon: typeof IconGitPullRequest; readonly color: string }
>;
const pullRequestCount = repositories.reduce(
  (total, repository) => total + repository.pullRequests.length,
  0
);

/** Search and expand open-source contributions by repository.
 * @returns The searchable contribution list.
 */
export const OpenSourceBrowser = () => {
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
    [normalizedQuery, stateFilter]
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
                    <img
                      alt=""
                      className="size-[30px] shrink-0 rounded-control border border-line-strong bg-surface-raised object-cover"
                      height="30"
                      loading="lazy"
                      src={`${assetBase}/${repository.image}`}
                      width="30"
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
                      ★ {repository.stars}
                    </span>
                    <span className="shrink-0 text-micro text-muted">
                      {repository.pullRequests.length} PR
                      {repository.pullRequests.length === 1 ? "" : "s"}
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-micro text-subtle transition-transform group-open:rotate-180"
                    >
                      ⌄
                    </span>
                  </summary>
                  <div className="pl-10">
                    <div className="-ml-10 border-b border-line pl-4">
                      <a
                        className="inline-flex min-h-10 items-center text-micro text-muted transition-colors hover:text-text"
                        href={`https://github.com/${repository.repo}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open repository
                        <IconExternalLink
                          aria-hidden="true"
                          className="ml-1"
                          size={12}
                          stroke={1.75}
                        />
                      </a>
                    </div>
                    {repository.pullRequests.map((pullRequest) => {
                      const { Icon: StatusIcon, color: statusColor } =
                        pullRequestStatus[pullRequest.state];

                      return (
                        <article
                          className="-ml-10 grid min-h-10 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-line py-2 last:border-0"
                          key={pullRequest.number}
                        >
                          <a
                            className="inline-flex min-w-0 items-center gap-1.5 text-small leading-4 text-text transition-colors hover:text-accent"
                            href={`https://github.com/${repository.repo}/pull/${pullRequest.number}`}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <StatusIcon
                              aria-hidden="true"
                              className={`shrink-0 ${statusColor}`}
                              size={14}
                              stroke={1.75}
                            />
                            {pullRequest.title}
                          </a>
                          <span
                            className={`inline-flex items-center gap-1 text-micro ${statusColor}`}
                          >
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
