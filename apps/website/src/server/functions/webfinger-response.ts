import { Option } from "effect";
import { decodeUnknownOption } from "effect/Schema";

import {
  CORS_HEADERS,
  resolveWebfingerResource,
  WebfingerResourceSchema,
} from "@/lib/webfinger";
import type { WebfingerDocument } from "@/lib/webfinger";

const badRequestError = { error: "Bad Request" } as const;
const noMatchError = { error: "No match" } as const;
const jrdContentType = "application/jrd+json";
const decodeWebfingerResource = decodeUnknownOption(WebfingerResourceSchema);

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
): Promise<Response> => {
  const resources = new URL(request.url).searchParams.getAll("resource");

  const resource =
    resources.length === 1 && resources[0] !== undefined
      ? decodeWebfingerResource({ value: resources[0] })
      : Option.none();

  if (Option.isNone(resource)) {
    return Promise.resolve(
      Response.json(badRequestError, {
        headers: { "Content-Type": jrdContentType, ...CORS_HEADERS },
        status: 400,
      })
    );
  }

  const lookup = resolveWebfingerResource(resource.value);

  if (lookup._tag === "NotFound") {
    return Promise.resolve(
      Response.json(noMatchError, {
        headers: { "Content-Type": jrdContentType, ...CORS_HEADERS },
        status: 404,
      })
    );
  }

  return Promise.resolve(
    Response.json(document, {
      headers: { "Content-Type": jrdContentType, ...CORS_HEADERS },
    })
  );
};
