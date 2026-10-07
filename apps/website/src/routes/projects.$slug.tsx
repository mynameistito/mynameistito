import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { projectSlug, projectSourceUrl, projects } from "@/lib/projects";

const radioAtlasStory = {
  why: [
    "I switched to Omarchy Quattro after watching typecraft install a flight radar plugin. Seeing what someone had built for their desktop made me want to make a plugin of my own.",
    "I landed on Radio Atlas, a globe for discovering radio stations around the world. You can pick a country, find a station, and listen without leaving your desktop.",
  ],
  what: "I built the plugin and published it to the Omarchy marketplace. You can spin the globe, pick a country, and listen to a station. I added search, favorites, and listening history so it's easy to get back to something you liked. Playback works with Omarchy's media controls, and your saved stations stay on your computer.",
  next: [
    "I announced Radio Atlas with a single screenshot. It became my biggest tweet, drew a response from DHH, and brought in people who shared their own demos and experiences.",
    "Radio Atlas won first place in the first official Omarchy plugin competition, with a $2,500 prize. I had already released it before the competition was announced. The attention helped my video pass 40,000 views and led to a follow from DHH.",
    "What started as my first plugin became one of the biggest things I've built. Seeing people around the world use it and share how much they enjoy it has been the best part.",
  ],
} as const;
const radioAtlasVideo = "https://www.youtube.com/watch?v=e3NBbt-PW5E";

const ProjectPage = () => {
  const { slug } = Route.useParams();
  const project = projects.find((item) => projectSlug(item.name) === slug);

  if (!project) {
    throw notFound();
  }

  const isRadioAtlas = project.name === "Radio Atlas";
  const sourceUrl = projectSourceUrl(project.name);

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
              Creator
            </span>
            <span>
              {isRadioAtlas
                ? "QML / Python / Shell"
                : project.languages.join(" / ")}
            </span>
          </div>
          <nav aria-label="Project links" className="mt-5 flex flex-wrap gap-3">
            {isRadioAtlas && (
              <a
                className="rounded-control border border-line bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent"
                href="#story"
              >
                Read the story
              </a>
            )}
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
              href={sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              View source <ArrowUpRight aria-hidden="true" size={14} />
            </a>
          </nav>
        </header>

        <img
          alt={`${project.name} project preview`}
          className="mt-6 aspect-[59/38] w-full rounded-lg border border-line-strong bg-surface-raised object-cover"
          height="416"
          src={project.image}
          width="646"
        />

        {isRadioAtlas && (
          <div className="mt-section grid max-w-prose gap-8" id="story">
            <section aria-labelledby="why-title">
              <h2
                className="m-0 text-base font-semibold text-text"
                id="why-title"
              >
                Why I built it
              </h2>
              {radioAtlasStory.why.map((paragraph) => (
                <p
                  className="mt-3 mb-0 text-base leading-copy text-muted"
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
            </section>
            <section aria-labelledby="what-title">
              <h2
                className="m-0 text-base font-semibold text-text"
                id="what-title"
              >
                What I did
              </h2>
              <p className="mt-3 mb-0 text-base leading-copy text-muted">
                {radioAtlasStory.what}
              </p>
            </section>
            <section aria-labelledby="next-title">
              <h2
                className="m-0 text-base font-semibold text-text"
                id="next-title"
              >
                What happened next
              </h2>
              {radioAtlasStory.next.map((paragraph) => (
                <p
                  className="mt-3 mb-0 text-base leading-copy text-muted"
                  key={paragraph}
                >
                  {paragraph}
                </p>
              ))}
              <a
                className="mt-4 inline-flex text-sm text-text underline decoration-subtle underline-offset-4 transition-colors hover:decoration-accent"
                href={radioAtlasVideo}
                rel="noreferrer"
                target="_blank"
              >
                Read the full story{" "}
                <ArrowUpRight aria-hidden="true" className="ml-1" size={14} />
              </a>
            </section>
          </div>
        )}

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
  beforeLoad: ({ params }) => {
    if (!projects.some((item) => projectSlug(item.name) === params.slug)) {
      throw notFound();
    }
  },
  component: ProjectPage,
  head: ({ params }) => {
    const project = projects.find(
      (item) => projectSlug(item.name) === params.slug
    );
    return {
      meta: [
        { title: `${project?.name ?? "Project"} | Akshar Patel` },
        {
          content:
            project?.description ?? "A project from Akshar Patel's portfolio.",
          name: "description",
        },
      ],
    };
  },
});
