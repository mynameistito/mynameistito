import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ProjectDirectory } from "@/features/projects/components/project-directory";
import { socialMeta } from "@/features/social/meta";
import { getProjects } from "@/server/functions/projects";

const ProjectsPage = () => {
  const [query, setQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");

  return (
    <ProjectDirectory
      onClearFilters={() => {
        setQuery("");
        setSelectedLanguage("");
      }}
      onLanguageChange={setSelectedLanguage}
      onQueryChange={setQuery}
      projects={Route.useLoaderData()}
      query={query}
      selectedLanguage={selectedLanguage}
    />
  );
};

export const Route = createFileRoute("/projects/")({
  loader: async () => await getProjects(),
  component: ProjectsPage,
  head: () => ({
    meta: [
      { title: "Projects | Tito" },
      {
        content: "Projects Tito has built and shipped.",
        name: "description",
      },
      ...socialMeta("Projects | Tito", "Projects Tito has built and shipped."),
    ],
  }),
});
