import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { projectSlug } from "@/lib/project";
import type { Project } from "@/lib/project";

interface ProjectListProps {
  items: readonly Project[];
  limit?: number;
  offset?: number;
  showImages?: boolean;
  previewOnHover?: boolean;
}

/** Renders the typographic project rows used throughout the portfolio.
 * @param props - Options for selecting and displaying projects.
 * @returns A list of project links.
 */
export const ProjectList = ({
  items,
  limit,
  offset = 0,
  showImages = false,
  previewOnHover = false,
}: ProjectListProps) => (
  <ul className="m-0 list-none border-t border-line p-0">
    {items.slice(offset, offset + (limit ?? items.length)).map((project) => (
      <li
        className={`border-b border-line ${previewOnHover && project.previewImage ? "project-preview-row" : ""}`}
        key={project.name}
      >
        <Link
          className={`group relative grid min-h-[72px] items-center gap-3 py-3 transition-colors hover:bg-surface-hover ${showImages ? "grid-cols-[42px_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]"}`}
          params={{ slug: projectSlug(project.name) }}
          to="/projects/$slug"
        >
          {showImages && (
            <img
              alt={`${project.name} owner avatar`}
              className="size-[42px] rounded-lg border border-line-strong bg-surface-raised object-cover"
              height="42"
              loading="lazy"
              src={project.image}
              width="42"
            />
          )}
          <span className="grid min-w-0 gap-0.75">
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold tracking-project text-text transition-colors group-hover:text-accent">
                {project.name}
              </span>
              <span className="truncate text-micro leading-4 text-subtle">
                {project.languages.join(" / ")}
              </span>
            </span>
            <span className="text-xs leading-row text-muted">
              {project.description}
            </span>
          </span>
          <ArrowUpRight
            aria-hidden="true"
            className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
            size={14}
          />
          {previewOnHover && project.previewImage && (
            <span aria-hidden="true" className="project-hover-preview">
              <img
                alt=""
                className="project-hover-preview-image"
                height="207"
                loading="lazy"
                src={project.previewImage}
                width="320"
              />
              <span className="project-hover-preview-caption">
                <span>{project.name}</span>
                <span>Read project</span>
              </span>
            </span>
          )}
        </Link>
      </li>
    ))}
  </ul>
);
