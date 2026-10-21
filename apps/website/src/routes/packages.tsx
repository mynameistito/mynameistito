import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import type { PackagesData } from "@/features/packages/packages";
import { socialMeta } from "@/features/social/meta";
import { getPackages } from "@/server/functions/packages";

const PackagesPage = () => {
  const { packages, refreshedAt } = Route.useLoaderData();
  const refreshedDate = refreshedAt === null ? null : new Date(refreshedAt);

  const lastUpdated =
    refreshedDate !== null && Number.isFinite(refreshedDate.getTime())
      ? refreshedDate.toISOString()
      : null;

  const weeklyDownloads = packages.reduce(
    (total, item) => total + item.weeklyDownloads,
    0
  );

  return (
    <main className="page-shell pt-page-top-header pb-page-bottom">
      <section className="mt-section">
        <h1 className="m-0 text-page-title leading-tight font-semibold tracking-title text-text">
          npm packages
        </h1>
        <p className="mt-2 mb-0 text-base leading-6 text-muted">
          Packages and tools I&apos;ve published to npm.
        </p>
      </section>

      <section aria-labelledby="packages-title" className="mt-section">
        <div className="mb-3 flex items-center justify-between gap-6">
          <h2
            className="m-0 text-base font-semibold text-text"
            id="packages-title"
          >
            Published packages
          </h2>
          <span className="text-xs text-muted">
            {packages.length} packages · {weeklyDownloads.toLocaleString()}{" "}
            weekly downloads
          </span>
        </div>
        {lastUpdated !== null && (
          <p className="mt-0 mb-3 text-xs text-muted">
            Data last updated{" "}
            <time dateTime={lastUpdated}>
              {lastUpdated.slice(0, 10)} at {lastUpdated.slice(11, 16)} UTC
            </time>
          </p>
        )}
        {packages.length > 0 ? (
          <ul className="m-0 list-none border-t border-line p-0">
            {packages.map((item) => (
              <li className="border-b border-line" key={item.name}>
                <article className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="grid min-w-0 gap-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <a
                        className="text-sm font-semibold tracking-project text-text transition-colors hover:text-accent"
                        href={item.npmUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {item.name}
                        <ExternalLink
                          aria-hidden="true"
                          className="ml-1 inline text-muted"
                          size={12}
                        />
                      </a>
                      <span className="text-micro text-subtle">
                        v{item.version}
                      </span>
                    </div>
                    <p className="m-0 text-xs leading-row text-muted">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-micro text-muted">
                    <span>
                      {item.weeklyDownloads.toLocaleString()} weekly downloads
                    </span>
                    {item.repositoryUrl !== undefined && (
                      <a
                        className="transition-colors hover:text-text"
                        href={item.repositoryUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Repository
                      </a>
                    )}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 border-t border-line py-5 text-sm text-muted">
            Package information is temporarily unavailable.
          </p>
        )}
      </section>
    </main>
  );
};

export const Route = createFileRoute("/packages")({
  loader: async (): Promise<PackagesData> => {
    try {
      return await getPackages();
    } catch {
      return { packages: [], refreshedAt: null };
    }
  },
  component: PackagesPage,
  head: () => ({
    meta: [
      { title: "npm packages | Tito" },
      {
        content: "npm packages published by Tito.",
        name: "description",
      },
      ...socialMeta("npm packages | Tito", "npm packages published by Tito."),
    ],
  }),
});
