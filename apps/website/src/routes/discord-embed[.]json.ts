import { createFileRoute } from "@tanstack/react-router";

import { homepageDiscordEmbed } from "@/lib/discord-component-embed";

const getEmbed = (): Response =>
  Response.json(homepageDiscordEmbed, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });

export const Route = createFileRoute("/discord-embed.json")({
  server: {
    handlers: {
      GET: getEmbed,
    },
  },
});
