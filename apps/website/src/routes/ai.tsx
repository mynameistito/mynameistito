import { createFileRoute } from "@tanstack/react-router";

import { AiUsageDashboard } from "@/components/ai-usage-dashboard";
import { socialMeta } from "@/lib/social-meta";
import { getTokscale } from "@/server/functions/tokscale";

const AiPage = () => <AiUsageDashboard snapshot={Route.useLoaderData()} />;

export const Route = createFileRoute("/ai")({
  loader: async () => await getTokscale(),
  component: AiPage,
  head: () => ({
    meta: [
      { title: "AI usage | Tito" },
      {
        content:
          "Daily token usage, estimated spend, favorite models, and coding harnesses.",
        name: "description",
      },
      ...socialMeta(
        "AI usage | Tito",
        "Daily token usage, estimated spend, favorite models, and coding harnesses."
      ),
    ],
  }),
});
