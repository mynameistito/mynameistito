import { createFileRoute } from "@tanstack/react-router";

import { PackagesView } from "@/features/packages/components/packages-view";
import type { PackagesData } from "@/features/packages/packages";
import { socialMeta } from "@/features/social/meta";
import { getPackages } from "@/server/functions/packages";

const PackagesPage = () => <PackagesView {...Route.useLoaderData()} />;

export const Route = createFileRoute("/packages")({
  loader: async (): Promise<PackagesData> => {
    try {
      return await getPackages();
    } catch {
      return { packages: [], refreshedAt: null };
    }
  },
  component: PackagesPage,
  head: () => ({
    meta: [
      { title: "npm packages | Tito" },
      {
        content: "npm packages published by Tito.",
        name: "description",
      },
      ...socialMeta("npm packages | Tito", "npm packages published by Tito."),
    ],
  }),
});
