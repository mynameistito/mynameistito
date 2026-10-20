import { Effect } from "effect";
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
});
