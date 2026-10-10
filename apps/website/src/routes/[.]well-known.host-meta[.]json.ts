import { createFileRoute } from "@tanstack/react-router";

import { CORS_HEADERS } from "@/lib/webfinger";

const hostMeta = {
  links: [
    {
      rel: "lrdd",
      template: "https://mynameistito.com/.well-known/webfinger?resource={uri}",
      type: "application/jrd+json",
    },
  ],
};
const getHostMetaJson = () =>
  Response.json(hostMeta, {
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
const options = () => new Response(null, { headers: CORS_HEADERS });

export const Route = createFileRoute("/.well-known/host-meta.json")({
  server: {
    handlers: {
      GET: getHostMetaJson,
      OPTIONS: options,
    },
  },
});
