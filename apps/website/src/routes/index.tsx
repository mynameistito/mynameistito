import { Link, createFileRoute } from "@tanstack/react-router";

import { projects } from "@/lib/projects";

const profile = {
  description:
    "I build TypeScript tools, Cloudflare projects, browser extensions, and other useful things for the open web.",
  name: "Tito",
  username: "@mynameistito",
};

const links = [
  { label: "GitHub", url: "https://github.com/mynameistito" },
  { label: "npm", url: "https://www.npmjs.com/~mynameistito" },
  { label: "X", url: "https://x.com/mynameistito" },
] as const;

const Home = () => (
  <main
    className="mx-auto w-[calc(100%-40px)] max-w-[644px] pt-18 pb-10.5 max-[520px]:w-[calc(100%-36px)] max-[520px]:pt-10"
    id="home"
  >
    <header className="flex items-center justify-between gap-6">
      <a
        aria-label="Tito, home"
        className="flex min-w-0 items-center gap-3.5"
        href="#home"
      >
        <img
          alt=""
          className="h-[52px] w-[52px] flex-none rounded-full border border-line bg-surface object-cover max-[520px]:size-[46px]"
          height="52"
          src="https://github.com/mynameistito.png"
          width="52"
        />
        <span className="grid min-w-0 gap-0.75">
          <span className="font-semibold tracking-tight">{profile.name}</span>
          <span className="text-xs text-muted">{profile.username}</span>
        </span>
      </a>
      <a
        className="text-xs text-muted transition-colors duration-150 hover:text-accent"
        href="https://github.com/mynameistito"
        rel="noreferrer"
        target="_blank"
      >
        GitHub <span aria-hidden="true">↗</span>
      </a>
    </header>

    <section
      aria-label="About me"
      className="mt-[27px] grid gap-3.5 text-muted leading-7 max-[520px]:mt-6 max-[520px]:text-sm"
    >
      <p>{profile.description}</p>
      <p>
        I enjoy contributing to open source, exploring new ideas, and making
        small tools that solve real problems. Browse my{" "}
        <a
          className="font-semibold text-text underline decoration-subtle underline-offset-4 transition-colors hover:decoration-accent"
          href="#projects"
        >
          projects
        </a>{" "}
        or find me on{" "}
        <a
          className="font-semibold text-text underline decoration-subtle underline-offset-4 transition-colors hover:decoration-accent"
          href={links[0].url}
        >
          GitHub
        </a>
        .
      </p>
    </section>

    <section
      aria-labelledby="projects-title"
      className="mt-10 max-[520px]:mt-[34px]"
      id="projects"
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3.5">
        <h1
          className="m-0 text-base font-semibold tracking-tight"
          id="projects-title"
        >
          Projects
        </h1>
        <Link
          className="text-xs text-muted transition-colors duration-150 hover:text-accent"
          to="/projects"
        >
          View all <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul className="m-0 list-none p-0">
        {projects.slice(0, 5).map((project) => (
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

    <footer
      className="flex flex-wrap justify-between gap-x-6 gap-y-4 pt-5.5 text-xs text-muted max-[520px]:justify-start"
      id="links"
    >
      <span>Elsewhere</span>
      <nav aria-label="Social links" className="flex flex-wrap gap-4.5">
        {links.map((link) => (
          <a
            className="transition-colors duration-150 hover:text-accent"
            href={link.url}
            key={link.label}
            rel="noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <a className="ml-auto" href="#home">
        Back to top ↑
      </a>
    </footer>
  </main>
);

export const Route = createFileRoute("/")({
  component: Home,
});
