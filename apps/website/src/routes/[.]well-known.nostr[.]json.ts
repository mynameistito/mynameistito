import { createFileRoute } from "@tanstack/react-router";

import { CORS_HEADERS } from "@/lib/webfinger";

const nostr = {
  names: {
    mynameistito:
      "59a9dc6c69e6f21cf68d653079948ce69ae9895df7d0d68e23d97df3bf249b53",
  },
};
const jsonHeaders = { "Content-Type": "application/json", ...CORS_HEADERS };
const getNostr = () => Response.json(nostr, { headers: jsonHeaders });
const headNostr = () => new Response(null, { headers: jsonHeaders });
const options = () => new Response(null, { headers: CORS_HEADERS });

export const Route = createFileRoute("/.well-known/nostr.json")({
  server: {
    handlers: {
      GET: getNostr,
      HEAD: headNostr,
      OPTIONS: options,
    },
  },
});
