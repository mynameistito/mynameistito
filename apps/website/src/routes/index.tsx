import { Link, createFileRoute } from "@tanstack/react-router";

import { ExperienceSection } from "@/components/experience-section";
import { ProjectList } from "@/components/project-list";
import { SiteHeader } from "@/components/site-header";
import { profile } from "@/lib/profile";
import { projects } from "@/lib/projects";

const repositories = [
  {
    name: "HyperFrames",
    repo: "heygen-com/hyperframes",
    stars: "58.1k",
    image: "71RASVRXFP2YGBJEHBAHPYX3TR.png",
  },
  {
    name: "OpenCode",
    repo: "anomalyco/opencode",
    stars: "212.1k",
    image: "2NNAKS92CEBF42T0HZHGGMDMZ0.png",
  },
  {
    name: "Omarchy",
    repo: "omacom/omarchy",
    stars: "44.1k",
    image: "65HVBPGYC2SFE9VSGFR38NMRWM.png",
  },
  {
    name: "T3 Code",
    repo: "pingdotgg/t3code",
    stars: "25.9k",
    image: "1H4A1TRND6EZ06JYHVGKPKWKYR.png",
  },
] as const;

const skillIcons = [
  "3F41YWXETCF4XDE2256VHX80D2.png",
  "4XY9SK1JFYXYPEBYNVQ3RTC5RM.png",
  "7FP20MN0T40PFCFT1SWAXNS7FP.png",
  "049Y71J6236AYHRSW6668BQJPN.png",
  "7DW8QT8GFP8CM1AAKQDHMZXJSG.png",
  "08HNNBFQ51QVXW09925ZTDKNMK.png",
  "10QY973Q0B9TPQGDYAH5A06HH5.png",
  "7CX5SFFE55BSHP9RAAHY8DVXKV.png",
  "3KT9PRSNW647RAQAJ5MK7VW688.png",
  "60X4F0FQ05S91XG0BPQYADV0KV.png",
  "3FC8WNSESY4P47E2N1CJ1TDVDG.png",
  "368NRBYEQSYHSVW7982X9B331B.png",
] as const;

const Home = () => (
  <main className="mx-auto w-[min(100%-48px,528px)] pt-10 pb-28 sm:pt-page-top sm:pb-page-bottom">
    <SiteHeader />

    <section aria-label="About Akshar" className="mt-2 grid gap-3.5">
      <p className="m-0 text-sm leading-copy tracking-copy text-muted">
        I currently work at Dow Jones.
      </p>
      <p className="m-0 text-sm leading-copy tracking-copy text-muted">
        Outside work, I enjoy contributing to open source, building things, and
        following whatever has my attention. Browse my{" "}
        <Link
          className="text-text underline decoration-subtle underline-offset-4"
          to="/projects"
        >
          projects
        </Link>{" "}
        or take a look at my{" "}
        <a
          className="text-text underline decoration-subtle underline-offset-4"
          href="https://www.apunlisted.com/taste"
        >
          taste
        </a>
        . You can also read my{" "}
        <a
          className="text-text underline decoration-subtle underline-offset-4"
          href="https://www.apunlisted.com/blog"
        >
          blog
        </a>
        . Everyone has one. Mine is obviously different.
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
        items={projects.filter((project) => project.featured)}
        previewOnHover
      />
    </section>

    <section aria-labelledby="open-source-title" className="mt-section">
      <div className="mb-3 flex min-h-7 items-center justify-between gap-6">
        <h2
          className="m-0 text-base font-semibold leading-heading tracking-heading text-text"
          id="open-source-title"
        >
          Open source
        </h2>
        <Link
          className="py-1 text-xs leading-5 text-muted transition-colors hover:text-text"
          to="/open-source"
        >
          See more
        </Link>
      </div>
      <ul className="m-0 list-none border-t border-line p-0">
        {repositories.map((repository) => (
          <li className="border-b border-line" key={repository.repo}>
            <a
              className="grid min-h-[66px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 transition-colors hover:bg-surface-hover"
              href={`https://github.com/${repository.repo}`}
              rel="noreferrer"
              target="_blank"
            >
              <span className="grid size-8 place-items-center overflow-hidden rounded-control border border-line-strong bg-surface-raised">
                <img
                  alt=""
                  className="size-full object-cover"
                  height="32"
                  loading="lazy"
                  src={`/paper-assets/${repository.image}`}
                  width="32"
                />
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate text-meta font-semibold leading-meta text-text">
                  {repository.name}
                </span>
                <span className="truncate text-small leading-small text-muted">
                  {repository.repo}
                </span>
              </span>
              <span className="text-small leading-small text-muted">
                {repository.stars}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="skills-title" className="mt-section">
      <h2
        className="m-0 text-base font-semibold leading-heading tracking-heading text-text"
        id="skills-title"
      >
        Skills
      </h2>
      <ul className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 p-0">
        {profile.skills.map((skill, index) => (
          <li className="list-none" key={skill}>
            <img
              alt={skill}
              className="size-[23px] object-contain opacity-75 grayscale"
              height="23"
              loading="lazy"
              src={`/paper-assets/${skillIcons[index]}`}
              title={skill}
              width="23"
            />
          </li>
        ))}
      </ul>
    </section>

    <section aria-labelledby="education-title" className="mt-section">
      <h2
        className="m-0 text-base font-semibold leading-heading tracking-heading text-text"
        id="education-title"
      >
        Education
      </h2>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-t border-line py-3 text-sm">
        <div>
          <p className="m-0 font-medium text-text">
            {profile.education.degree}
          </p>
          <p className="m-0 text-xs leading-5 text-muted">
            {profile.education.institution}
          </p>
        </div>
        <div className="text-right text-xs leading-5 text-muted">
          <p className="m-0">{profile.education.period}</p>
          <p className="m-0">{profile.education.detail}</p>
        </div>
      </div>
    </section>

    <section className="mt-section flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
      <div>
        <h2 className="m-0 text-sm font-semibold text-text">
          Have something in mind?
        </h2>
        <p className="mt-1 mb-0 text-sm text-muted">
          I&apos;m always open to a good conversation.
        </p>
      </div>
      <Link
        className="rounded-control border border-line bg-surface px-3 py-2 text-sm font-medium text-text transition-colors hover:border-accent"
        to="/contact"
      >
        Let&apos;s talk
      </Link>
    </section>
  </main>
);

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Akshar Patel — apunlisted.com" },
      {
        content:
          "Akshar Patel. Data analyst, open-source contributor, and builder.",
        name: "description",
      },
    ],
  }),
});
