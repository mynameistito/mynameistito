import { createFileRoute } from "@tanstack/react-router";

import { CORS_HEADERS, webfingerJson } from "@/features/identity/webfinger";
import { webfingerResponse } from "@/server/functions/webfinger-response";

const getWebfingerJson = async ({
  request,
}: {
  request: Request;
}): Promise<Response> => await webfingerResponse(request, webfingerJson);

const options = () => new Response(null, { headers: CORS_HEADERS });

export const Route = createFileRoute("/.well-known/webfinger.json")({
  server: {
    handlers: {
      GET: getWebfingerJson,
      OPTIONS: options,
    },
  },
});
