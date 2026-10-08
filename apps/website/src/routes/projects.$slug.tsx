import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { projectSlug } from "@/lib/project";
import { getProjects } from "@/server/functions/projects";

const ProjectPage = () => {
  const { slug } = Route.useParams();
  const projects = Route.useLoaderData();
  const project = projects.find((item) => projectSlug(item.name) === slug);
  if (!project) {
    throw notFound();
  }

  return (
    <main className="page-shell pt-page-top-header pb-page-bottom">
      <SiteHeader backLabel="Projects" backTo="/projects" />
      <article>
        <header className="mt-section">
          <h1 className="m-0 text-page-title font-semibold leading-tight tracking-title text-text">
            {project.name}
          </h1>
          <p className="mt-2 mb-0 max-w-prose text-base leading-copy text-muted">
            {project.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded-control border border-line bg-surface px-2 py-1">
              GitHub project
            </span>
            {project.languages.length > 0 && (
              <span>{project.languages.join(" / ")}</span>
            )}
          </div>
          <nav aria-label="Project links" className="mt-5 flex flex-wrap gap-3">
            {project.demo && (
              <a
                className="rounded-control border border-line bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent"
                href={project.demo}
                rel="noreferrer"
                target="_blank"
              >
                View live project <ArrowUpRight aria-hidden="true" size={14} />
              </a>
            )}
            <a
              className="rounded-control bg-text px-3 py-2 text-sm font-medium text-page transition-transform active:scale-[0.98]"
              href={project.source}
              rel="noreferrer"
              target="_blank"
            >
              View source <ArrowUpRight aria-hidden="true" size={14} />
            </a>
            <a
              className="rounded-control border border-line bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent"
              href={`${project.source}/blob/HEAD/README.md`}
              rel="noreferrer"
              target="_blank"
            >
              Read README <ArrowUpRight aria-hidden="true" size={14} />
            </a>
          </nav>
        </header>

        <img
          alt={`${project.name} owner avatar`}
          className="mt-6 aspect-[59/38] w-full rounded-lg border border-line-strong bg-surface-raised object-contain p-12"
          height="416"
          src={project.image}
          width="646"
        />

        <section
          aria-labelledby="about-project-title"
          className="mt-section max-w-prose"
        >
          <h2
            className="m-0 text-base font-semibold text-text"
            id="about-project-title"
          >
            About this project
          </h2>
          <p className="mt-3 mb-0 text-base leading-copy text-muted">
            This project is pinned on my GitHub profile. Its description,
            languages, preview, and links are kept in sync from GitHub.
          </p>
        </section>

        <section aria-labelledby="more-projects-title" className="mt-section">
          <h2
            className="m-0 text-base font-semibold text-text"
            id="more-projects-title"
          >
            More projects
          </h2>
          <ul className="mt-2 list-none border-t border-line p-0">
            {projects
              .filter((item) => item.name !== project.name)
              .slice(0, 3)
              .map((item) => (
                <li className="border-b border-line" key={item.name}>
                  <Link
                    className="flex min-h-14 items-center justify-between gap-4 text-sm text-text transition-colors hover:text-accent"
                    params={{ slug: projectSlug(item.name) }}
                    to="/projects/$slug"
                  >
                    <span>{item.name}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="text-muted"
                      size={14}
                    />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      </article>
    </main>
  );
};

export const Route = createFileRoute("/projects/$slug")({
  beforeLoad: async ({ params }) => {
    const projects = await getProjects();
    if (
      !projects.some((project) => projectSlug(project.name) === params.slug)
    ) {
      throw notFound();
    }
  },
  loader: () => getProjects(),
  component: ProjectPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replaceAll("-", " ")} | Tito` },
      { content: "A project built by Tito.", name: "description" },
    ],
  }),
});
