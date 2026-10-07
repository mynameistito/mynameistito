import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { SiteHeader } from "@/components/site-header";

const assetBase = "/paper-assets";

const repositories = [
  {
    name: "HyperFrames",
    repo: "heygen-com/hyperframes",
    stars: "58.1k",
    prs: 12,
    image: "71RASVRXFP2YGBJEHBAHPYX3TR.png",
  },
  {
    name: "Omarchy",
    repo: "omacom/omarchy",
    stars: "44.1k",
    prs: 6,
    image: "65HVBPGYC2SFE9VSGFR38NMRWM.png",
  },
  {
    name: "T3 Code",
    repo: "pingdotgg/t3code",
    stars: "25.9k",
    prs: 9,
    image: "1H4A1TRND6EZ06JYHVGKPKWKYR.png",
  },
  {
    name: "OpenCode",
    repo: "anomalyco/opencode",
    stars: "212.1k",
    prs: 9,
    image: "2NNAKS92CEBF42T0HZHGGMDMZ0.png",
  },
  {
    name: "Diffusion Studio",
    repo: "diffusionstudio/editor",
    stars: "3,237",
    prs: 1,
    image: "6KN2TM55ZWZ6B4QG0D3AQQ8MCE.png",
  },
  {
    name: "Flea",
    repo: "thisisgm/flea",
    stars: "720",
    prs: 5,
    image: "4BZ0JWMZZCF5F4643XG8BT9CFP.png",
  },
  {
    name: "OpenTUI",
    repo: "anomalyco/opentui",
    stars: "13.5k",
    prs: 1,
    image: "2NNAKS92CEBF42T0HZHGGMDMZ0.png",
  },
  {
    name: "Effect",
    repo: "Effect-TS/effect",
    stars: "17.1k",
    prs: 1,
    image: "75CTBX1PAT3C29VQMFS28N4WRW.png",
  },
  {
    name: "awesome-ratatui",
    repo: "ratatui/awesome-ratatui",
    stars: "2,036",
    prs: 1,
    image: "2PZQAA7RH9Y27RXXFC3EDA2J27.png",
  },
  {
    name: "Ralphy",
    repo: "michaelshimeles/ralphy",
    stars: "2,976",
    prs: 1,
    image: "4PX42DY0P5P1XMWRFWAYD7TA7K.png",
  },
] as const;

const contributions = [
  {
    title: "fix(studio): preserve authored caption groups on import",
    status: "Open",
    number: 3900,
  },
  {
    title: "feat(registry): add caret swap text effect",
    status: "Open",
    number: 3898,
  },
  {
    title: "fix(studio): preserve caption text when parsing transcripts",
    status: "Open",
    number: 3896,
  },
  {
    title: "feat(studio): add a preview volume control",
    status: "Merged",
    number: 3282,
  },
  {
    title: "feat(registry): add kinetic center build component",
    status: "Merged",
    number: 3269,
  },
  {
    title: "fix(catalog): sync tab labels with the sliding indicator",
    status: "Merged",
    number: 3267,
  },
  {
    title: "fix(registry): clear flowchart selection after click-away",
    status: "Merged",
    number: 3262,
  },
  {
    title: "fix(catalog): restore the caption texture preview",
    status: "Merged",
    number: 3258,
  },
  {
    title: "fix(catalog): center the menu morph preview",
    status: "Merged",
    number: 3256,
  },
  {
    title: "fix(catalog): keep the text stagger preview inside the frame",
    status: "Merged",
    number: 3255,
  },
  {
    title: "fix(catalog): keep the animated bar chart preview in frame",
    status: "Merged",
    number: 3254,
  },
  {
    title: "fix(catalog): keep the typewriter preview inside the frame",
    status: "Merged",
    number: 3249,
  },
] as const;

const filters = ["All", "Open", "Merged", "Closed"] as const;

const OpenSourcePage = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof filters)[number]>("All");
  const [selectedRepository, setSelectedRepository] =
    useState<string>("HyperFrames");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRepositories = useMemo(
    () =>
      repositories.filter((repository) =>
        `${repository.name} ${repository.repo}`
          .toLowerCase()
          .includes(normalizedQuery)
      ),
    [normalizedQuery]
  );
  const filteredContributions = contributions.filter((contribution) => {
    const matchesStatus = status === "All" || contribution.status === status;
    const matchesQuery = contribution.title
      .toLowerCase()
      .includes(normalizedQuery);
    return matchesStatus && matchesQuery;
  });
  const contributionCount = contributions.filter(
    (contribution) => status === "All" || contribution.status === status
  ).length;
  const selected = repositories.find(
    (repository) => repository.name === selectedRepository
  );

  return (
    <main className="mx-auto w-[min(100%-48px,528px)] pt-20 pb-28 sm:pt-24">
      <SiteHeader backLabel="Portfolio" backTo="/" />
      <section className="mt-7">
        <h1 className="m-0 text-page-title font-semibold leading-tight tracking-title text-text">
          Open source
        </h1>
        <p className="mt-2 mb-0 text-base leading-6 text-muted">
          Contributions to the tools and communities I use.
        </p>
      </section>

      <section aria-labelledby="pull-requests-title" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2
            className="m-0 text-base font-semibold text-text"
            id="pull-requests-title"
          >
            Pull requests
          </h2>
          <span className="text-xs text-muted">
            {contributions.length} recent pull requests
          </span>
        </div>
        <label
          className="grid gap-2 text-sm text-muted"
          htmlFor="contribution-search"
        >
          Search contributions
          <input
            autoComplete="off"
            className="h-10 rounded-control border border-line bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-subtle focus:border-focus"
            id="contribution-search"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Title, repository, or pull request"
            type="search"
            value={query}
          />
        </label>
        <fieldset className="mt-4 flex flex-wrap gap-2 border-0 p-0">
          <legend className="sr-only">Filter pull requests</legend>
          {filters.map((filter) => (
            <button
              aria-pressed={status === filter}
              className={`rounded-control border px-3 py-1.5 text-xs transition-colors ${status === filter ? "border-line bg-surface-raised text-text" : "border-transparent text-muted hover:text-text"}`}
              key={filter}
              onClick={() => setStatus(filter)}
              type="button"
            >
              {filter}{" "}
              <span className="ml-1 text-subtle">
                {
                  contributions.filter(
                    (contribution) =>
                      filter === "All" || contribution.status === filter
                  ).length
                }
              </span>
            </button>
          ))}
        </fieldset>

        <div className="mt-4 flex items-center justify-between border-b border-line pb-3 text-xs text-muted">
          <span>
            {filteredContributions.length} of {contributionCount} recent pull
            requests
          </span>
          <a
            className="transition-colors hover:text-text"
            href={`https://github.com/${selected?.repo ?? ""}`}
            rel="noreferrer"
            target="_blank"
          >
            Open repository <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line py-3">
          <img
            alt=""
            className="size-8 rounded-control border border-line-strong bg-surface-raised object-cover"
            height="32"
            src={`${assetBase}/${selected?.image ?? repositories[0].image}`}
            width="32"
          />
          <div className="min-w-0">
            <p className="m-0 truncate text-meta font-semibold leading-meta text-text">
              {selected?.name}
            </p>
            <p className="m-0 truncate text-small leading-small text-muted">
              {selected?.repo}
            </p>
          </div>
          <span className="text-small text-muted">{selected?.stars}</span>
        </div>
        <ul className="m-0 list-none border-b border-line p-0">
          {selectedRepository === "HyperFrames" ? (
            filteredContributions.map((contribution) => (
              <li
                className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-line py-2.5 last:border-0"
                key={contribution.number}
              >
                <span className="text-xs leading-row text-text">
                  {contribution.title}
                </span>
                <span className="text-small text-muted">
                  {contribution.status}
                </span>
                <span className="text-small text-subtle">
                  #{contribution.number}
                </span>
              </li>
            ))
          ) : (
            <li className="py-4 text-xs leading-5 text-muted">
              Select a repository below to browse its contributions.
            </li>
          )}
        </ul>
        {filteredContributions.length === 0 &&
          selectedRepository === "HyperFrames" && (
            <p className="m-0 border-b border-line py-5 text-sm text-muted">
              No pull requests match “{query}”. Try another search.
            </p>
          )}
      </section>

      <section aria-labelledby="repositories-title" className="mt-9">
        <h2
          className="mb-3 mt-0 text-base font-semibold text-text"
          id="repositories-title"
        >
          Repositories
        </h2>
        <ul className="m-0 list-none border-t border-line p-0">
          {filteredRepositories.map((repository) => (
            <li className="border-b border-line" key={repository.repo}>
              <button
                aria-pressed={selectedRepository === repository.name}
                className="grid min-h-[66px] w-full grid-cols-[32px_minmax(0,1fr)_auto_12px] items-center gap-3 py-2.5 text-left"
                onClick={() => {
                  setSelectedRepository(repository.name);
                  setStatus("All");
                }}
                type="button"
              >
                <img
                  alt=""
                  className="size-8 rounded-control border border-line-strong bg-surface-raised object-cover"
                  height="32"
                  loading="lazy"
                  src={`${assetBase}/${repository.image}`}
                  width="32"
                />
                <span className="grid min-w-0 gap-0.5">
                  <span className="truncate text-meta font-semibold leading-meta text-text">
                    {repository.name}
                  </span>
                  <span className="truncate text-small leading-small text-muted">
                    {repository.repo}
                  </span>
                </span>
                <span className="text-right text-small leading-small text-muted">
                  <span className="block">{repository.stars}</span>
                  <span>{repository.prs} PRs</span>
                </span>
                <span aria-hidden="true" className="text-xs text-muted">
                  ↗
                </span>
              </button>
            </li>
          ))}
        </ul>
        {filteredRepositories.length === 0 && (
          <p className="m-0 border-b border-line py-5 text-sm text-muted">
            No repositories match “{query}”. Try another search.
          </p>
        )}
      </section>
    </main>
  );
};

export const Route = createFileRoute("/open-source")({
  component: OpenSourcePage,
  head: () => ({
    meta: [
      { title: "Open source | Akshar Patel" },
      {
        content: "Open-source contributions by Akshar Patel.",
        name: "description",
      },
    ],
  }),
});
