import { createFileRoute } from "@tanstack/react-router";

import { CORS_HEADERS, webfinger } from "@/lib/webfinger";
import { webfingerResponse } from "@/server/functions/webfinger-response";

const getWebfinger = async ({
  request,
}: {
  request: Request;
}): Promise<Response> => await webfingerResponse(request, webfinger);

const options = () => new Response(null, { headers: CORS_HEADERS });

export const Route = createFileRoute("/.well-known/webfinger")({
  server: {
    handlers: {
      GET: getWebfinger,
      OPTIONS: options,
    },
  },
});
