import { createFileRoute } from "@tanstack/react-router";

import { testEmojiComponentEmbed } from "@/lib/test-emoji-component-embed";

const getEmbed = (): Promise<Response> =>
  Promise.resolve(
    Response.json(testEmojiComponentEmbed, {
      headers: { "Cache-Control": "public, max-age=300" },
    })
  );

export const Route = createFileRoute("/test-emoji-embed.json")({
  server: {
    handlers: {
      GET: getEmbed,
    },
  },
});
