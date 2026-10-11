import { describe, expect, it } from "vitest";

import { isProjectVisible } from "@/lib/project";

describe("project visibility", () => {
  it("shows non-archived projects by default", () => {
    expect(isProjectVisible({ archived: false })).toBeTruthy();
  });

  it("hides archived projects by default", () => {
    expect(isProjectVisible({ archived: true })).toBeFalsy();
  });

  it("allows explicitly showing an archived project", () => {
    expect(
      isProjectVisible({ archived: true, showInProjects: true })
    ).toBeTruthy();
  });

  it("allows explicitly hiding a non-archived project", () => {
    expect(
      isProjectVisible({ archived: false, showInProjects: false })
    ).toBeFalsy();
  });
});
