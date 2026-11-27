import { createFileRoute } from "@tanstack/react-router";
import { Option, Schema } from "effect";
import { useState } from "react";

import { ProjectDirectory } from "@/features/projects/components/project-directory";
import { socialMeta } from "@/features/social/meta";
import { getProjects } from "@/server/functions/projects";

interface ProjectSearch {
  readonly q?: string;
  readonly language?: string;
}

const decodeSearch = Schema.decodeUnknownOption(
  Schema.Struct({
    language: Schema.optional(Schema.String),
    q: Schema.optional(
      Schema.Union([Schema.String, Schema.Number, Schema.Boolean])
    ),
  })
);

const ProjectsPage = () => {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(search.q ?? "");

  const [selectedLanguage, setSelectedLanguage] = useState(
    search.language ?? ""
  );

  return (
    <ProjectDirectory
      onClearFilters={() => {
        setQuery("");
        setSelectedLanguage("");

        if (search.q !== undefined || search.language !== undefined) {
          void navigate({ replace: true, search: {} });
        }
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
  validateSearch: (search): ProjectSearch => {
    const decoded = Option.getOrUndefined(decodeSearch(search));

    const q = decoded?.q;

    return {
      q: q === undefined ? undefined : String(q),
      language: decoded?.language,
    };
  },
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
  remountDeps: ({ search }) => search,
});
