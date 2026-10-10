import { createFileRoute } from "@tanstack/react-router";

import { CORS_HEADERS, webfinger } from "@/lib/webfinger";

const getWebfinger = () =>
  Response.json(webfinger, {
    headers: { "Content-Type": "application/jrd+json", ...CORS_HEADERS },
  });
const options = () => new Response(null, { headers: CORS_HEADERS });

export const Route = createFileRoute("/.well-known/webfinger")({
  server: {
    handlers: {
      GET: getWebfinger,
      OPTIONS: options,
    },
  },
});
