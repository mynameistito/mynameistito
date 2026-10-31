import { ProjectList } from "@/features/projects/components/project-list";
import { isProjectVisible } from "@/features/projects/project";
import type { Project } from "@/features/projects/project";
import { filterProjects } from "@/features/projects/project-filter";

interface ProjectDirectoryProps {
  readonly projects: readonly Project[];
  readonly query: string;
  readonly selectedLanguage: string;
  readonly onQueryChange: (query: string) => void;
  readonly onLanguageChange: (language: string) => void;
  readonly onClearFilters: () => void;
}

/**
 * Renders project discovery controls and results for the supplied filter state.
 *
 * @param props - Projects, current filters, and filter update callbacks.
 * @returns The project directory and its filtered results.
 */
export const ProjectDirectory = ({
  projects,
  query,
  selectedLanguage,
  onQueryChange,
  onLanguageChange,
  onClearFilters,
}: ProjectDirectoryProps) => {
  const visibleProjects = projects.filter(isProjectVisible);

  const languages = [
    ...new Set(visibleProjects.flatMap((project) => project.languages)),
  ].toSorted((left, right) => left.localeCompare(right));

  const filteredProjects = filterProjects(
    visibleProjects,
    query,
    selectedLanguage
  );

  const featuredProjects = filteredProjects.filter(
    (project) => project.featured
  );

  const otherProjects = filteredProjects.filter((project) => !project.featured);

  return (
    <main className="page-shell pt-page-top-header pb-page-bottom">
      <section className="mt-section">
        <h1 className="m-0 text-page-title leading-tight font-semibold tracking-title text-text">
          Projects
        </h1>
        <p className="mt-2 mb-0 text-base leading-6 text-muted">
          Things I&apos;ve built and shipped.
        </p>
      </section>

      <div className="mt-section grid items-end gap-3 sm:grid-cols-2">
        <label
          className="grid min-w-0 gap-1.5 text-micro leading-4 text-muted"
          htmlFor="project-search"
        >
          Search projects
          <input
            autoComplete="off"
            className="h-[34px] min-w-0 rounded-control border border-line bg-surface px-2.5 text-xs text-text transition-colors outline-none placeholder:text-subtle focus:border-focus"
            id="project-search"
            onChange={(event) => {
              onQueryChange(event.currentTarget.value);
            }}
            placeholder="Name or description"
            type="search"
            value={query}
          />
        </label>
        <label
          className="grid min-w-0 gap-1.5 text-micro leading-4 text-muted"
          htmlFor="project-language"
        >
          Language
          <select
            className="h-[34px] min-w-0 rounded-control border border-line bg-surface px-2.5 text-xs text-text transition-colors outline-none focus:border-focus"
            id="project-language"
            onChange={(event) => {
              onLanguageChange(event.currentTarget.value);
            }}
            value={selectedLanguage}
          >
            <option value="">All languages</option>
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="mt-section border-t border-line py-5">
          <output className="m-0 block text-sm text-muted">
            No projects match the current filters.
          </output>
          <button
            className="mt-3 text-xs text-accent underline underline-offset-4"
            onClick={onClearFilters}
            type="button"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <section aria-labelledby="featured-title" className="mt-section">
            <div className="mb-3 flex items-center justify-between gap-6">
              <h2
                className="m-0 text-base font-semibold text-text"
                id="featured-title"
              >
                Featured projects
              </h2>
              <span className="text-xs text-muted">
                {featuredProjects.length} projects
              </span>
            </div>
            <ProjectList items={featuredProjects} showImages />
          </section>

          <section aria-labelledby="other-title" className="mt-section">
            <div className="mb-3 flex items-center justify-between gap-6">
              <h2
                className="m-0 text-base font-semibold text-text"
                id="other-title"
              >
                Other projects
              </h2>
              <span className="text-xs text-muted">
                {otherProjects.length} projects
              </span>
            </div>
            <ProjectList items={otherProjects} showImages />
          </section>
        </>
      )}
    </main>
  );
};
