import { createFileRoute } from "@tanstack/react-router";

import { OpenSourceBrowser } from "@/components/open-source-browser";

export const Route = createFileRoute("/open-source")({
  component: OpenSourceBrowser,
  head: () => ({
    meta: [
      { title: "Open source | Akshar Patel" },
      {
        content: "Open-source contributions by Akshar Patel.",
        name: "description",
      },
    ],
  }),
});
