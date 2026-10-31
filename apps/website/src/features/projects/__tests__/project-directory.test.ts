import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProjectDirectory } from "@/features/projects/components/project-directory";
import type { Project } from "@/features/projects/project";

const defaults = {
  archived: false,
  description: "Command tools",
  featured: false,
  image: "https://example.com/avatar.png",
  source: "https://github.com/example/project",
};

const projects: readonly Project[] = [
  {
    ...defaults,
    description: "Browser tools",
    featured: true,
    languages: ["TypeScript", "Rust"],
    name: "featured-zeta",
  },
  {
    ...defaults,
    languages: ["TypeScript", "Go"],
    name: "other-alpha",
  },
  {
    ...defaults,
    archived: true,
    featured: true,
    languages: ["COBOL"],
    name: "archived-hidden",
  },
  {
    ...defaults,
    languages: ["Java"],
    name: "explicitly-hidden",
    showInProjects: false,
  },
  {
    ...defaults,
    archived: true,
    languages: ["Ruby"],
    name: "restored-archive",
    showInProjects: true,
  },
];

const ignoreFilterChange = (): void => {
  // Static rendering does not invoke event handlers.
};

const renderDirectory = async (
  query = "",
  selectedLanguage = "",
  items: readonly Project[] = projects
) => {
  const root = createRootRoute();

  const directory = createRoute({
    getParentRoute: () => root,
    path: "/projects/",
  });

  const detail = createRoute({
    getParentRoute: () => root,
    path: "/projects/$slug",
  });

  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/projects/"] }),
    routeTree: root.addChildren([directory, detail]),
  });

  await router.load();

  const providerProps = {
    children: createElement(ProjectDirectory, {
      onClearFilters: ignoreFilterChange,
      onLanguageChange: ignoreFilterChange,
      onQueryChange: ignoreFilterChange,
      projects: items,
      query,
      selectedLanguage,
    }),
    router,
  };

  return renderToStaticMarkup(
    createElement(RouterContextProvider, providerProps)
  );
};

describe("project directory rendering", () => {
  it("renders native search and language controls with associated labels", async () => {
    const html = await renderDirectory();

    expect(html).toMatch(
      /<label[^>]*for="project-search"[^>]*>Search projects<input[^>]*id="project-search"[^>]*type="search"/u
    );
    expect(html).toMatch(
      /<label[^>]*for="project-language"[^>]*>Language<select[^>]*id="project-language"/u
    );
    expect(html).toContain(
      '<option value="" selected="">All languages</option>'
    );
  });

  it("derives unique sorted languages from visible projects before search filtering", async () => {
    const html = await renderDirectory("featured-zeta");

    const options = Array.from(
      html.matchAll(/<option[^>]*>[^<]*<\/option>/gu),
      (match) => match[0]
    );

    expect(options).toStrictEqual([
      '<option value="" selected="">All languages</option>',
      '<option value="Go">Go</option>',
      '<option value="Ruby">Ruby</option>',
      '<option value="Rust">Rust</option>',
      '<option value="TypeScript">TypeScript</option>',
    ]);
  });

  it("renders visible projects in the featured and other sections with detail links", async () => {
    const html = await renderDirectory();

    const featured =
      /<section aria-labelledby="featured-title".*?<\/section>/su.exec(
        html
      )?.[0];

    const other = /<section aria-labelledby="other-title".*?<\/section>/su.exec(
      html
    )?.[0];

    expect(featured).toMatch(
      /Featured projects.*1 project.*href="\/projects\/featured-zeta"/su
    );
    expect(featured).not.toContain('href="/projects/other-alpha"');
    expect(other).toMatch(
      /Other projects.*2 projects.*href="\/projects\/other-alpha".*href="\/projects\/restored-archive"/su
    );
    expect(other).not.toContain('href="/projects/featured-zeta"');
    expect(html).not.toMatch(
      /archived-hidden|explicitly-hidden|Clear filters/u
    );
  });

  it("renders the supplied filters and only matching project rows", async () => {
    const html = await renderDirectory("Browser", "TypeScript");

    expect(html).toContain('value="Browser"');
    expect(html).toContain(
      '<option value="TypeScript" selected="">TypeScript</option>'
    );
    expect(html).toContain('href="/projects/featured-zeta"');
    expect(html).not.toMatch(
      /href="\/projects\/(?:other-alpha|restored-archive)"/u
    );
    expect(html).not.toContain('aria-labelledby="other-title"');
  });

  it("renders a no-results message and clear-filters button when combined filters exclude all rows", async () => {
    const html = await renderDirectory("Browser", "Go");

    expect(html).toMatch(
      /<output[^>]*>No projects match the current filters\.<\/output>/u
    );
    expect(html).toMatch(
      /<button[^>]*type="button"[^>]*>Clear filters<\/button>/u
    );
    expect(html).not.toContain('aria-labelledby="featured-title"');
    expect(html).not.toContain('aria-labelledby="other-title"');
    expect(html).not.toContain('href="/projects/');
  });

  it("renders an empty directory with controls and no project rows", async () => {
    const html = await renderDirectory("", "", []);

    expect(html).toMatch(/id="project-search".*id="project-language"/su);
    expect(html.match(/<option/gu)).toHaveLength(1);
    expect(html).toContain("No projects match the current filters.");
    expect(html).toContain("Clear filters");
    expect(html).not.toContain("<li");
  });
});
