import type { Project } from "@/features/projects/project";

/**
 * Narrows visible projects by name, description, and language without reordering.
 *
 * @param projects - Projects already allowed in the directory.
 * @param query - Case-insensitive text to find in names or descriptions.
 * @param selectedLanguage - Optional case-insensitive language name.
 * @returns Matching projects in their original order.
 */
export const filterProjects = (
  projects: readonly Project[],
  query: string,
  selectedLanguage?: string
) => {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedLanguage = selectedLanguage?.toLowerCase() ?? "";

  return projects.filter(
    (project) =>
      (project.name.toLowerCase().includes(normalizedQuery) ||
        project.description.toLowerCase().includes(normalizedQuery)) &&
      (normalizedLanguage === "" ||
        project.languages.some(
          (language) => language.toLowerCase() === normalizedLanguage
        ))
  );
};
