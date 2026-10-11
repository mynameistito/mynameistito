import {
  Link,
  createFileRoute,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { isProjectVisible, projectSlug } from "@/lib/project";
import { socialMeta } from "@/lib/social-meta";
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
      <article>
        <header className="mt-section">
          <h1 className="m-0 text-page-title leading-tight font-semibold tracking-title text-text">
            {project.name}
          </h1>
          <p className="mt-2 mb-0 max-w-prose text-base leading-copy text-muted">
            {project.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
            <span className="inline-flex min-h-6 items-center rounded-control border border-line bg-surface px-2">
              GitHub project
            </span>
            {project.languages.length > 0 && (
              <span className="inline-flex min-h-6 items-center">
                {project.languages.join(" / ")}
              </span>
            )}
            <nav
              aria-label="Project links"
              className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-2"
            >
              {project.demo && (
                <a
                  className="inline-flex min-h-6 items-center text-text underline underline-offset-2 transition-colors hover:text-accent"
                  href={project.demo}
                  rel="noreferrer"
                  target="_blank"
                >
                  View live project
                </a>
              )}
              <a
                className="inline-flex min-h-6 items-center text-text underline underline-offset-2 transition-colors hover:text-accent"
                href={project.source}
                rel="noreferrer"
                target="_blank"
              >
                View source
              </a>
            </nav>
          </div>
        </header>

        {project.detailImage && (
          <img
            alt={`${project.name} project preview`}
            className="mt-6 aspect-[59/38] w-full rounded-lg border border-line-strong bg-surface-raised object-cover"
            height="416"
            src={project.detailImage}
            width="646"
          />
        )}

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
              .filter(
                (item) => item.name !== project.name && isProjectVisible(item)
              )
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
  loader: async ({ params }) => {
    const projects = await getProjects();
    const project = projects.find(
      (item) => projectSlug(item.name) === params.slug
    );
    if (!project) {
      throw notFound();
    }
    if (!project.hasDetailPage) {
      throw redirect({ href: project.source });
    }
    return projects;
  },
  component: ProjectPage,
  head: ({ params }) => {
    const title = `${params.slug.replaceAll("-", " ")} | Tito`;
    const description = "A project built by Tito.";

    return {
      meta: [
        { title },
        { content: description, name: "description" },
        ...socialMeta(title, description),
      ],
    };
  },
});
