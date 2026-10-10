import { createFileRoute } from "@tanstack/react-router";

import { CORS_HEADERS, webfingerJson } from "@/lib/webfinger";

const getWebfingerJson = () =>
  Response.json(webfingerJson, {
    headers: { "Content-Type": "application/jrd+json", ...CORS_HEADERS },
  });
const options = () => new Response(null, { headers: CORS_HEADERS });

export const Route = createFileRoute("/.well-known/webfinger.json")({
  server: {
    handlers: {
      GET: getWebfingerJson,
      OPTIONS: options,
    },
  },
});
