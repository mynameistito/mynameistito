import { describe, expect, it } from "vitest";

import type { Project } from "@/features/projects/project";
import { filterProjects } from "@/features/projects/project-filter";

const defaults = {
  archived: false,
  featured: false,
  image: "https://example.com/avatar.png",
  source: "https://github.com/example/project",
};

const projects: readonly Project[] = [
  {
    ...defaults,
    description: "Testing tools for web apps",
    featured: true,
    languages: ["TypeScript", "JavaScript"],
    name: "zeta-kit",
  },
  {
    ...defaults,
    description: "Migration tools",
    languages: ["Rust"],
    name: "alpha-cli",
  },
  {
    ...defaults,
    description: "",
    languages: ["TypeScript"],
    name: "middle-app",
  },
];

describe("project filters", () => {
  it("returns all projects in their original order without filters", () => {
    expect(filterProjects(projects, "")).toStrictEqual(projects);
  });

  it("treats whitespace-only queries and an empty language as no filters", () => {
    expect(filterProjects(projects, "  ", "")).toStrictEqual(projects);
  });

  it("matches part of a project name", () => {
    expect(filterProjects(projects, "cli")).toStrictEqual([projects[1]]);
  });

  it("matches part of a project description", () => {
    expect(filterProjects(projects, "Migration")).toStrictEqual([projects[1]]);
  });

  it("ignores query case and surrounding whitespace", () => {
    expect(filterProjects(projects, " ZETA ")).toStrictEqual([projects[0]]);
    expect(filterProjects(projects, " TESTING ")).toStrictEqual([projects[0]]);
  });

  it("matches any listed language case-insensitively", () => {
    expect(filterProjects(projects, "", "jAvAsCrIpT")).toStrictEqual([
      projects[0],
    ]);
  });

  it("requires a full language name", () => {
    expect(filterProjects(projects, "", "Script")).toStrictEqual([]);
  });

  it("requires both query and language to match", () => {
    expect(filterProjects(projects, "tools", "typescript")).toStrictEqual([
      projects[0],
    ]);
    expect(filterProjects(projects, "migration", "TypeScript")).toStrictEqual(
      []
    );
  });

  it("preserves order, project values, and the input when filtering", () => {
    expect(filterProjects(projects, "", "TypeScript")).toStrictEqual([
      projects[0],
      projects[2],
    ]);
    expect(projects.map((project) => project.name)).toStrictEqual([
      "zeta-kit",
      "alpha-cli",
      "middle-app",
    ]);
  });

  it("returns no results for an unmatched query or an empty directory", () => {
    expect(filterProjects(projects, "missing")).toStrictEqual([]);
    expect(filterProjects([], "tools", "Rust")).toStrictEqual([]);
  });
});
