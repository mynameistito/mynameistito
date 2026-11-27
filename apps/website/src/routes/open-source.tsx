import { createFileRoute } from "@tanstack/react-router";
import { Option, Schema } from "effect";

import { OpenSourceBrowser } from "@/features/open-source/components/open-source-browser";
import { socialMeta } from "@/features/social/meta";
import { getContributions } from "@/server/functions/contributions";

interface ContributionSearch {
  readonly q?: string;
  readonly state?: string;
}

const decodeSearch = Schema.decodeUnknownOption(
  Schema.Struct({
    q: Schema.optional(
      Schema.Union([Schema.String, Schema.Number, Schema.Boolean])
    ),
    state: Schema.optional(Schema.String),
  })
);

const OpenSourcePage = () => (
  <OpenSourceBrowser
    initialFilters={Route.useSearch()}
    repositories={Route.useLoaderData()}
  />
);

export const Route = createFileRoute("/open-source")({
  validateSearch: (search): ContributionSearch => {
    const decoded = Option.getOrUndefined(decodeSearch(search));

    const q = decoded?.q;

    return {
      q: q === undefined ? undefined : String(q),
      state: decoded?.state,
    };
  },
  loader: async () => await getContributions(),
  component: OpenSourcePage,
  head: () => ({
    meta: [
      { title: "Open source | Tito" },
      {
        content: "Open-source contributions by Tito.",
        name: "description",
      },
      ...socialMeta("Open source | Tito", "Open-source contributions by Tito."),
    ],
  }),
  remountDeps: ({ search }) => search,
});
