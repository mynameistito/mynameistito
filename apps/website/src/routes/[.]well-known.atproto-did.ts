import { createFileRoute } from "@tanstack/react-router";

import { CORS_HEADERS } from "@/lib/webfinger";

const getDid = () =>
  new Response("did:plc:axa5ezrbvrw6imhwoscl6evp", {
    headers: { "Content-Type": "text/plain", ...CORS_HEADERS },
  });
const options = () => new Response(null, { headers: CORS_HEADERS });

export const Route = createFileRoute("/.well-known/atproto-did")({
  server: {
    handlers: {
      GET: getDid,
      OPTIONS: options,
    },
  },
});
