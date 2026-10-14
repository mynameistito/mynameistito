import { createFileRoute } from "@tanstack/react-router";

import { CORS_HEADERS, webfingerJson } from "@/lib/webfinger";
import { webfingerResponse } from "@/server/functions/webfinger-response";

const getWebfingerJson = ({
  request,
}: {
  request: Request;
}): Promise<Response> => webfingerResponse(request, webfingerJson);

const options = () => new Response(null, { headers: CORS_HEADERS });

export const Route = createFileRoute("/.well-known/webfinger.json")({
  server: {
    handlers: {
      GET: getWebfingerJson,
      OPTIONS: options,
    },
  },
});
