import { createFileRoute } from "@tanstack/react-router";

import { CORS_HEADERS } from "@/lib/webfinger";

const hostMeta = `<?xml version="1.0" encoding="UTF-8"?>
<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
  <Link rel="lrdd" type="application/jrd+json" template="https://mynameistito.com/.well-known/webfinger?resource={uri}"/>
</XRD>`;
const getHostMeta = () =>
  new Response(hostMeta, {
    headers: { "Content-Type": "application/xrd+xml", ...CORS_HEADERS },
  });
const options = () => new Response(null, { headers: CORS_HEADERS });

export const Route = createFileRoute("/.well-known/host-meta")({
  server: {
    handlers: {
      GET: getHostMeta,
      OPTIONS: options,
    },
  },
});
