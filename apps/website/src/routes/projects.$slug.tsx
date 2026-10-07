import { Link, createFileRoute } from "@tanstack/react-router";

import { projectSlug } from "@/components/project-list";
import { SiteHeader } from "@/components/site-header";
import { projectSourceUrl, projects } from "@/lib/projects";

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
    return (
      <main className="mx-auto w-[min(100%-48px,644px)] pt-10 pb-24 sm:pt-page-top">
        <SiteHeader backLabel="Portfolio" backTo="/" />
        <section className="mt-8 border-y border-line py-8">
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-text">
            Project not found
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            That project isn&apos;t in this portfolio.
          </p>
          <Link
            className="mt-4 inline-flex text-sm text-text underline decoration-subtle underline-offset-4 hover:decoration-accent"
            to="/projects"
          >
            Back to projects
          </Link>
        </section>
      </main>
    );
  }

  const isRadioAtlas = project.name === "Radio Atlas";
  const sourceUrl = projectSourceUrl(project.name);

  return (
    <main className="mx-auto w-[min(100%-48px,644px)] pt-10 pb-24 sm:pt-page-top">
      <SiteHeader backLabel="Projects" backTo="/projects" />
      <article>
        <header className="mt-7">
          <h1 className="m-0 text-page-title font-semibold leading-tight tracking-title text-text">
            {project.name}
          </h1>
          <p className="mt-2 mb-0 text-sm leading-6 text-muted">
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
                View live project <span aria-hidden="true">↗</span>
              </a>
            )}
            <a
              className="rounded-control bg-text px-3 py-2 text-sm font-medium text-page transition-transform active:scale-[0.98]"
              href={sourceUrl}
              rel="noreferrer"
              target="_blank"
            >
              View source <span aria-hidden="true">↗</span>
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
          <div className="mt-8 grid gap-8" id="story">
            <section aria-labelledby="why-title">
              <h2
                className="m-0 text-base font-semibold text-text"
                id="why-title"
              >
                Why I built it
              </h2>
              {radioAtlasStory.why.map((paragraph) => (
                <p
                  className="mt-3 mb-0 text-sm leading-6 text-muted"
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
              <p className="mt-3 mb-0 text-sm leading-6 text-muted">
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
                  className="mt-3 mb-0 text-sm leading-6 text-muted"
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
                <span aria-hidden="true" className="ml-1">
                  ↗
                </span>
              </a>
            </section>
          </div>
        )}

        <section aria-labelledby="more-projects-title" className="mt-10">
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
                    <span aria-hidden="true" className="text-muted">
                      →
                    </span>
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
