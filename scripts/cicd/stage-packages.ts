import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

type DependencyField =
  | "dependencies"
  | "devDependencies"
  | "optionalDependencies"
  | "peerDependencies";
type DependencyMap = Record<string, string>;

interface PackageManifest {
  name: string;
  version: string;
  dependencies?: DependencyMap;
  devDependencies?: DependencyMap;
  optionalDependencies?: DependencyMap;
  peerDependencies?: DependencyMap;
}

interface RootManifest {
  catalog?: DependencyMap;
  catalogs?: Record<string, DependencyMap>;
}

const manifestFilename = "package.json";
// SAFETY: The repository root package.json is validated by the workspace tooling.
const rootManifest = JSON.parse(
  readFileSync(manifestFilename, "utf-8")
) as RootManifest;

const resolveCatalog = (dependencies: DependencyMap): DependencyMap =>
  Object.fromEntries(
    Object.entries(dependencies).map(([name, value]) => {
      if (!value.startsWith("catalog:")) {
        return [name, value];
      }

      const catalogName = value.slice("catalog:".length);
      const catalog = catalogName
        ? rootManifest.catalogs?.[catalogName]
        : rootManifest.catalog;
      const version = catalog?.[name];

      if (!version) {
        throw new Error(
          `Missing catalog entry for ${catalogName || "default"}:${name}`
        );
      }

      return [name, version];
    })
  );

const resolveManifestCatalog = (manifest: PackageManifest): void => {
  const dependencyFields: DependencyField[] = [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ];

  for (const field of dependencyFields) {
    const dependencies = manifest[field];
    if (dependencies) {
      manifest[field] = resolveCatalog(dependencies);
    }
  }
};

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const hasPendingChangesets = readdirSync(".changeset").some((file) => {
  if (!file.endsWith(".md")) {
    return false;
  }

  const content = readFileSync(path.join(".changeset", file), "utf-8");
  return /^['"][^'"]+['"]\s*:\s*(?:patch|minor|major)$/mu.test(content);
});

if (hasPendingChangesets) {
  console.log("Pending Changesets found; waiting for the version PR");
  process.exit(0);
}

const stagePackage = (directory: { name: string }): void => {
  const packageDirectory = path.join("packages", directory.name);
  // SAFETY: Each packages/* directory is expected to contain a package manifest.
  const manifest = JSON.parse(
    readFileSync(path.join(packageDirectory, manifestFilename), "utf-8")
  ) as PackageManifest;
  const packageSpec = `${manifest.name}@${manifest.version}`;

  try {
    execFileSync(
      npmCommand,
      [
        "view",
        packageSpec,
        "version",
        "--prefer-online",
        "--min-release-age=0",
      ],
      { stdio: "ignore" }
    );
    console.log(`${packageSpec} is already published`);
    return;
  } catch {
    console.log(`Staging ${packageSpec} with npm latest`);
  }

  const stagedDirectory = mkdtempSync(path.join(tmpdir(), "mynameistito-"));

  try {
    cpSync(packageDirectory, stagedDirectory, { recursive: true });
    const packageManifestPath = path.join(stagedDirectory, manifestFilename);
    // SAFETY: The staged directory was copied from a validated packages/* directory.
    const packageManifest = JSON.parse(
      readFileSync(packageManifestPath, "utf-8")
    ) as PackageManifest;
    resolveManifestCatalog(packageManifest);
    writeFileSync(
      packageManifestPath,
      `${JSON.stringify(packageManifest, null, 2)}\n`,
      "utf-8"
    );
    execFileSync(
      npmCommand,
      [
        "stage",
        "publish",
        "--access",
        "public",
        "--tag",
        "latest",
        "--provenance",
        "--ignore-scripts",
      ],
      { cwd: stagedDirectory, stdio: ["ignore", "inherit", "pipe"] }
    );
  } catch (error) {
    const details =
      error instanceof Error && "stderr" in error ? String(error.stderr) : "";
    process.stderr.write(details);
    const message = `${error instanceof Error ? error.message : String(error)} ${details}`;

    if (
      !message.includes("E409") &&
      !message.includes("previously published")
    ) {
      throw error;
    }

    console.log(`${packageSpec} is already staged`);
  } finally {
    rmSync(stagedDirectory, { force: true, recursive: true });
  }
};

for (const directory of readdirSync("packages", { withFileTypes: true })) {
  if (directory.isDirectory()) {
    stagePackage(directory);
  }
}
