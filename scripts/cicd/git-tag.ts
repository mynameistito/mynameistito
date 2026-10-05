import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface PackageManifest {
  name: string;
  version: string;
}

interface ChangesetsOutputEvent {
  packageName: string;
  tag: string;
  type: "git-tag";
}

const outputPath = process.env.CHANGESETS_OUTPUT;
if (!outputPath) {
  throw new Error("CHANGESETS_OUTPUT is required by the Changesets action");
}

const gitCommand = process.platform === "win32" ? "git.exe" : "git";
const bunxCommand = process.platform === "win32" ? "bunx.exe" : "bunx";

const existingTags = new Set(
  execFileSync(gitCommand, ["ls-remote", "--tags", "origin"], {
    encoding: "utf-8",
  })
    .split("\n")
    .map((line) => line.match(/refs\/tags\/(?<tag>.+)$/u)?.groups?.tag)
    .filter((tag): tag is string => tag !== undefined && !tag.endsWith("^{}"))
);

execFileSync(bunxCommand, ["changeset", "git-tag"], {
  stdio: "inherit",
});

const events: ChangesetsOutputEvent[] = [];
for (const directory of readdirSync("packages", { withFileTypes: true })) {
  if (!directory.isDirectory()) {
    continue;
  }

  // SAFETY: Each packages/* directory is expected to contain a package manifest.
  const manifest = JSON.parse(
    readFileSync(path.join("packages", directory.name, "package.json"), "utf-8")
  ) as PackageManifest;
  const tag = `${manifest.name}@${manifest.version}`;

  if (!existingTags.has(tag)) {
    events.push({ packageName: manifest.name, tag, type: "git-tag" });
  }
}

writeFileSync(
  outputPath,
  events.map((event) => JSON.stringify(event)).join("\n"),
  "utf-8"
);
