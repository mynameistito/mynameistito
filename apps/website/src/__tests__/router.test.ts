import { afterEach, describe, expect, it, vi } from "vitest";

import { getRouter } from "@/router";

describe("router factory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses memory history when a Worker has window but no document", () => {
    vi.stubGlobal("window", { history: {} });

    expect(() => getRouter()).not.toThrow();
  });
});
