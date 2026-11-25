import { createFileRoute } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";

import { SocialDockPreviews } from "@/features/social/components/dock";
import { loadSocialProfiles } from "@/features/social/profiles";

const get = async () => {
  const data = await loadSocialProfiles();

  return new Response(
    renderToStaticMarkup(<SocialDockPreviews data={data} />),
    {
      headers: {
        "cache-control": "public, max-age=300",
        "content-type": "text/html; charset=utf-8",
      },
    }
  );
};

export const Route = createFileRoute("/api/portfolio-footer")({
  server: { handlers: { GET: get } },
});
