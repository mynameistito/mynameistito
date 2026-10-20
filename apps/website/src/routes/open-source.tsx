import { createFileRoute } from "@tanstack/react-router";

import { OpenSourceBrowser } from "@/features/open-source/components/open-source-browser";
import { socialMeta } from "@/features/social/meta";
import { getContributions } from "@/server/functions/contributions";

const OpenSourcePage = () => (
  <OpenSourceBrowser repositories={Route.useLoaderData()} />
);

export const Route = createFileRoute("/open-source")({
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
});
