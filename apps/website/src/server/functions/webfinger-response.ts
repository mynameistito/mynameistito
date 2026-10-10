import { CORS_HEADERS, resolveWebfingerResource } from "@/lib/webfinger";
import type { WebfingerDocument } from "@/lib/webfinger";

const badRequestError = { error: "Bad Request" } as const;
const noMatchError = { error: "No match" } as const;
const jrdContentType = "application/jrd+json";

/**
 * Build a WebFinger response for a request and its representation document.
 *
 * @param request - The incoming WebFinger request.
 * @param document - The JRD document to return for a supported resource.
 * @returns A successful JRD response, bad request, or no-match response.
 */
export const webfingerResponse = (
  request: Request,
  document: WebfingerDocument
): Response => {
  const resources = new URL(request.url).searchParams.getAll("resource");
  const lookup = resolveWebfingerResource(
    resources.length === 1 ? (resources[0] ?? null) : null
  );

  if (lookup._tag === "InvalidResource") {
    return Response.json(badRequestError, {
      headers: { "Content-Type": jrdContentType, ...CORS_HEADERS },
      status: 400,
    });
  }
  if (lookup._tag === "NotFound") {
    return Response.json(noMatchError, {
      headers: { "Content-Type": jrdContentType, ...CORS_HEADERS },
      status: 404,
    });
  }

  return Response.json(document, {
    headers: { "Content-Type": jrdContentType, ...CORS_HEADERS },
  });
};
