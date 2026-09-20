import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const packageName = "mynameistito";
const types = new Set(["patch", "minor", "major"]);
const [type, ...summaryParts] = process.argv.slice(2);
const summary = summaryParts.join(" ").trim();

if (!type || !types.has(type) || !summary) {
  console.error('Usage: bun run changeset-add <patch|minor|major> "summary"');
  process.exit(1);
}

const changesetDirectory = path.resolve(".changeset");
await mkdir(changesetDirectory, { recursive: true });
const changeset = `---\n"${packageName}": ${type}\n---\n\n${summary}\n`;

const createChangeset = async (filename: string): Promise<string> => {
  try {
    await writeFile(path.resolve(changesetDirectory, filename), changeset, {
      encoding: "utf-8",
      flag: "wx",
    });
    return filename;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "EEXIST"
    ) {
      throw error;
    }

    return createChangeset(`${randomBytes(4).toString("hex")}.md`);
  }
};

const createdFilename = await createChangeset(
  `${randomBytes(4).toString("hex")}.md`
);
console.log(`Created .changeset/${createdFilename} for ${packageName}`);
