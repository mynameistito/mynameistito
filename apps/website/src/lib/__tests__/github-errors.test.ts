import { Effect } from "effect";
import {
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";
import { describe, expect, it } from "vitest";

import {
  exposeGitHubRequestError,
  formatGitHubRequestError,
  GitHubRequestError,
} from "@/lib/provider/github/errors";

describe("GitHub request errors", () => {
  it("formats the operation and safe underlying error details", () => {
    const error = new GitHubRequestError({
      operation: "searchPullRequests",
      cause: new Error("API temporarily unavailable"),
    });

    expect(formatGitHubRequestError(error)).toBe(
      "GitHub searchPullRequests failed: Error: API temporarily unavailable."
    );
  });

  it("includes the HTTP status and response failure summary", () => {
    const request = HttpClientRequest.get(
      "https://api.github.com/search/issues"
    );

    const response = HttpClientResponse.fromWeb(
      request,
      new Response(null, { status: 403 })
    );

    const error = new GitHubRequestError({
      operation: "searchPullRequests",
      cause: new HttpClientError.HttpClientError({
        reason: new HttpClientError.StatusCodeError({ request, response }),
      }),
    });

    expect(formatGitHubRequestError(error)).toContain("HTTP 403:");
  });

  it("formats transport failures that have no HTTP response", () => {
    const request = HttpClientRequest.get(
      "https://api.github.com/search/issues"
    );

    const error = new GitHubRequestError({
      operation: "searchPullRequests",
      cause: new HttpClientError.HttpClientError({
        reason: new HttpClientError.TransportError({
          request,
          cause: new Error("network unavailable"),
        }),
      }),
    });

    expect(formatGitHubRequestError(error)).toContain("Transport error");
    expect(formatGitHubRequestError(error)).not.toContain("HTTP");
  });

  it("formats non-Error causes", () => {
    const error = new GitHubRequestError({
      operation: "searchPullRequests",
      cause: "unexpected provider failure",
    });

    expect(formatGitHubRequestError(error)).toBe(
      "GitHub searchPullRequests failed: unexpected provider failure."
    );
  });

  it("preserves GitHub request details when an Effect crosses a runtime boundary", async () => {
    const error = new GitHubRequestError({
      operation: "searchPullRequests",
      cause: new Error("API temporarily unavailable"),
    });

    await expect(
      Effect.runPromise(exposeGitHubRequestError(Effect.fail(error)))
    ).rejects.toThrow(
      "GitHub searchPullRequests failed: Error: API temporarily unavailable."
    );
  });

  it("leaves non-GitHub failures unchanged", async () => {
    await expect(
      Effect.runPromise(
        exposeGitHubRequestError(Effect.fail(new Error("KV unavailable")))
      )
    ).rejects.toThrow("KV unavailable");
  });
});
