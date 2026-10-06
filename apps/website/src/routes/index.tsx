import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

const profile = {
  description:
    "Tito builds TypeScript CLIs, Cloudflare tools, browser extensions, and small useful internet things.",
  name: "My Name is Tito",
};

const links = [
  { label: "Website", url: "https://mynameistito.com" },
  { label: "GitHub", url: "https://github.com/mynameistito" },
  { label: "npm", url: "https://www.npmjs.com/~mynameistito" },
  { label: "X", url: "https://x.com/mynameistito" },
] as const;

const projects = [
  {
    description:
      "A CLI for creating Cloudflare API tokens (User Tokens) with an interactive, guided prompt flow.",
    name: "create-cf-token",
    url: "https://github.com/mynameistito/create-cf-token",
  },
  {
    description:
      "Stop paying SEVENTEEN DIFFERENT BILLS for your shitty todo app. Stop pretending you're an infra genius when you're just bleeding money.",
    name: "justfuckingusecloudflare",
    url: "https://github.com/mynameistito/justfuckingusecloudflare",
  },
  {
    description: "OpenCode TUI plugin for usage limits of AI Providers",
    name: "oc-usage-limits-plugin",
    url: "https://github.com/mynameistito/oc-usage-limits-plugin",
  },
  {
    description:
      "A CLI tool that update deps across multiple repos with auto commits and pull requests.",
    name: "repo-updater",
    url: "https://github.com/mynameistito/repo-updater",
  },
  {
    description: "My Personal OpenCode v2 Plugins",
    name: "opencode-plugins",
    url: "https://github.com/mynameistito/opencode-plugins",
  },
  {
    description:
      "Effect and Alchemy service for fixing Instagram embeds in Discord",
    name: "fxinstagram",
    url: "https://github.com/mynameistito/fxinstagram",
  },
  {
    description:
      "Per-tab volume control with up to 600% boost. Cross-browser (Chrome + Firefox).",
    name: "volume-master",
    url: "https://github.com/mynameistito/volume-master",
  },
  {
    description: "CLI for inspecting Codex usage windows and reset credits",
    name: "codex-usage",
    url: "https://github.com/mynameistito/codex-usage",
  },
  {
    description:
      "TypeScript client for Hamilton City Council Fight the Landfill bin-day lookup API.",
    name: "hcc-bin-day",
    url: "https://github.com/mynameistito/hcc-bin-day",
  },
] as const;

const Home = () => (
  <main className="mx-auto min-h-screen w-full max-w-7xl px-6 pb-16 sm:px-10 lg:px-16">
    <header className="flex min-h-18 items-center justify-between border-b border-border">
      <a
        className="font-mono text-sm font-semibold tracking-tight"
        href="#home"
      >
        tito<span className="text-primary">.</span>
      </a>
      <nav aria-label="Main navigation" className="flex items-center gap-6">
        <a
          className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          href="#projects"
        >
          Projects
        </a>
        <a
          className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          href="#links"
        >
          Links
        </a>
      </nav>
    </header>

    <section
      aria-labelledby="home-title"
      className="grid gap-10 border-b border-border py-20 sm:py-28 md:grid-cols-[1.25fr_0.75fr] md:items-end md:gap-16"
      id="home"
    >
      <div>
        <p className="mb-5 font-mono text-xs tracking-widest text-primary uppercase">
          Independent developer
        </p>
        <h1
          className="max-w-3xl text-5xl leading-tight font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl"
          id="home-title"
        >
          {profile.name}
        </h1>
      </div>
      <div className="max-w-md md:justify-self-end">
        <p className="text-lg leading-8 text-muted-foreground">
          {profile.description}
        </p>
        <a
          className={cn(
            "mt-7 inline-flex items-center gap-2 border-b border-primary pb-1 text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          )}
          href="#projects"
        >
          Browse projects <span aria-hidden="true">↘</span>
        </a>
      </div>
    </section>

    <section
      aria-labelledby="projects-title"
      className="py-16 sm:py-20"
      id="projects"
    >
      <div className="mb-8 flex items-end justify-between gap-6">
        <h2
          className="text-3xl font-semibold tracking-tight text-foreground"
          id="projects-title"
        >
          Projects
        </h2>
        <p className="pb-1 font-mono text-xs text-muted-foreground">
          A selection from GitHub
        </p>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {projects.map((project, index) => (
          <li key={project.name}>
            <a
              className="group grid gap-2 py-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary sm:grid-cols-[3rem_minmax(10rem,0.8fr)_1.2fr_auto] sm:items-baseline sm:gap-4"
              href={project.url}
              rel="noreferrer"
              target="_blank"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-medium text-foreground group-hover:text-primary">
                {project.name}
              </span>
              <span className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {project.description}
              </span>
              <span
                aria-hidden="true"
                className="hidden text-muted-foreground transition-transform group-hover:translate-x-1 sm:inline"
              >
                ↗
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>

    <footer
      aria-labelledby="links-title"
      className="flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between"
      id="links"
    >
      <h2
        className="text-sm font-medium text-muted-foreground"
        id="links-title"
      >
        Find me elsewhere
      </h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <a
              className="text-sm text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              href={link.url}
              rel="noreferrer"
              target="_blank"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  </main>
);

export const Route = createFileRoute("/")({
  component: Home,
});
