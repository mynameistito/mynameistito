import { createFileRoute } from "@tanstack/react-router";

import { ProjectList } from "@/components/project-list";
import { SiteHeader } from "@/components/site-header";
import { projects } from "@/lib/projects";

const featuredProjects = projects.filter((project) => project.featured);
const otherProjects = projects.filter((project) => !project.featured);

const ProjectsPage = () => (
  <main className="mx-auto w-[min(100%-48px,644px)] pt-20 pb-24 sm:pt-24">
    <SiteHeader backLabel="Portfolio" backTo="/" />

    <section className="mt-7">
      <h1 className="m-0 text-page-title font-semibold leading-tight tracking-title text-text">
        Projects
      </h1>
      <p className="mt-2 mb-0 text-base leading-6 text-muted">
        Things I&apos;ve built and shipped.
      </p>
    </section>

    <section aria-labelledby="featured-title" className="mt-8">
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

    <section aria-labelledby="other-title" className="mt-9">
      <div className="mb-3 flex items-center justify-between gap-6">
        <h2 className="m-0 text-base font-semibold text-text" id="other-title">
          Other projects
        </h2>
        <span className="text-xs text-muted">
          {otherProjects.length} projects
        </span>
      </div>
      <ProjectList items={otherProjects} showImages />
    </section>
  </main>
);

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects | Akshar Patel" },
      {
        content: "Projects built and shipped by Akshar Patel.",
        name: "description",
      },
    ],
  }),
});
