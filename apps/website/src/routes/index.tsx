import { Link, createFileRoute } from "@tanstack/react-router";

import { ExperienceSection } from "@/components/experience-section";
import { ProjectList } from "@/components/project-list";
import { HomeProfile, SiteHeader } from "@/components/site-header";
import { profile } from "@/lib/profile";
import { getProjects } from "@/server/functions/projects";

const Home = () => (
  // Keep the landing page's featured rows in sync with the GitHub pins.
  <HomeContent />
);

const HomeContent = () => {
  const projects = Route.useLoaderData();
  return (
    <main className="page-shell pt-page-top pb-page-bottom">
      <SiteHeader />
      <HomeProfile />

      <section aria-label="About Tito" className="mt-2 grid gap-3.5">
        <h1 className="sr-only">Tito</h1>
        <p className="m-0 text-base leading-copy tracking-copy text-muted">
          I like messing with things and seeing where they go.
        </p>
        <p className="m-0 text-base leading-copy tracking-copy text-muted">
          I&apos;m a developer from New Zealand. I build tools, services, and
          experiments around whatever has my attention. Have a look at my{" "}
          <Link className="text-text underline" to="/projects">
            projects
          </Link>{" "}
          or see what I&apos;ve been contributing to in{" "}
          <Link className="text-text underline" to="/open-source">
            open source
          </Link>
          .
        </p>
      </section>

      <ExperienceSection />

      <section
        aria-labelledby="projects-title"
        className="mt-section"
        id="projects"
      >
        <div className="mb-3 flex min-h-7 items-center justify-between gap-6">
          <h2
            className="m-0 text-base font-semibold leading-heading tracking-heading text-text"
            id="projects-title"
          >
            Projects
          </h2>
          <Link
            className="py-1 text-xs leading-5 text-muted transition-colors hover:text-text"
            to="/projects"
          >
            View all
          </Link>
        </div>
        <ProjectList
          items={projects.filter((project) => project.featured).slice(0, 3)}
          previewOnHover
        />
      </section>

      <section className="mt-section flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <div>
          <h2 className="m-0 text-sm font-semibold text-text">Want to chat?</h2>
          <p className="mt-1 mb-0 text-sm text-muted">
            Hit me up. Discord is the fastest way to reach me.
          </p>
        </div>
        <Link
          className="rounded-control border border-line bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent"
          to="/contact"
        >
          Hit me up
        </Link>
      </section>
    </main>
  );
};

export const Route = createFileRoute("/")({
  loader: () => getProjects(),
  component: Home,
  head: () => ({
    meta: [
      { title: "Tito — mynameistito.com" },
      {
        content: `${profile.name} is a developer from New Zealand who likes messing with things and seeing where they go.`,
        name: "description",
      },
    ],
  }),
});
