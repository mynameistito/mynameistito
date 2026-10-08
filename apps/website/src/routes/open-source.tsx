import { createFileRoute } from "@tanstack/react-router";

import { OpenSourceBrowser } from "@/components/open-source-browser";
import { getContributions } from "@/server/functions/contributions";

const OpenSourcePage = () => (
  <OpenSourceBrowser repositories={Route.useLoaderData()} />
);

export const Route = createFileRoute("/open-source")({
  loader: () => getContributions(),
  component: OpenSourcePage,
  head: () => ({
    meta: [
      { title: "Open source | Tito" },
      {
        content: "Open-source contributions by Tito.",
        name: "description",
      },
    ],
  }),
});
