import { Link, createFileRoute } from "@tanstack/react-router";

import { projects } from "@/lib/projects";

const ProjectsPage = () => (
  <main className="mx-auto w-[calc(100%-40px)] max-w-[644px] pt-18 pb-10.5 max-[520px]:w-[calc(100%-36px)] max-[520px]:pt-10">
    <header className="flex items-center justify-between gap-6">
      <Link
        aria-label="Tito, home"
        className="flex min-w-0 items-center gap-3.5"
        to="/"
      >
        <img
          alt=""
          className="h-[52px] w-[52px] flex-none rounded-full border border-line bg-surface object-cover max-[520px]:size-[46px]"
          height="52"
          src="https://github.com/mynameistito.png"
          width="52"
        />
        <span className="grid min-w-0 gap-0.75">
          <span className="font-semibold tracking-tight">Tito</span>
          <span className="text-xs text-muted">@mynameistito</span>
        </span>
      </Link>
      <Link
        className="text-xs text-muted transition-colors duration-150 hover:text-accent"
        to="/"
      >
        ← Home
      </Link>
    </header>

    <section aria-labelledby="projects-title" className="mt-9">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3.5">
        <h1
          className="m-0 text-base font-semibold tracking-tight"
          id="projects-title"
        >
          All projects
        </h1>
        <span className="text-xs text-muted">{projects.length} projects</span>
      </div>
      <ul className="m-0 list-none p-0">
        {projects.map((project) => (
          <li className="border-b border-line" key={project.name}>
            <a
              className="group flex min-h-[72px] items-center justify-between gap-4.5 py-3.5"
              href={project.url}
              rel="noreferrer"
              target="_blank"
            >
              <span className="grid min-w-0 gap-1">
                <span className="flex min-w-0 flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold tracking-tight transition-colors duration-150 group-hover:text-accent">
                    {project.name}
                  </span>
                  <span className="text-xs text-muted">
                    {project.languages.join(" / ")}
                  </span>
                </span>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-normal text-muted max-[520px]:line-clamp-2 max-[520px]:whitespace-normal">
                  {project.description}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="flex-none text-sm text-muted transition duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
              >
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  </main>
);

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects | My Name is Tito" },
      {
        content: "A collection of tools and projects by Tito.",
        name: "description",
      },
    ],
  }),
});
