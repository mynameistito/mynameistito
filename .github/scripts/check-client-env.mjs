import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const clientDirectory = "apps/website/dist/client";
const forbiddenContent = [
  "op://",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CONTACT_RECIPIENT",
  "GH_TOKEN",
  "GITHUB_TOKEN",
  "MDFROMX_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "TURNSTILE_SECRET",
  "WORKER_GITHUB_TOKEN",
];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".svg",
]);
const findings = [];

const visit = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(filePath);
        return;
      }

      if (!textExtensions.has(path.extname(filePath).toLowerCase())) {
        return;
      }

      const content = await readFile(filePath, "utf-8");
      findings.push(
        ...forbiddenContent
          .filter((marker) => content.includes(marker))
          .map((marker) => ({ marker, path: filePath }))
      );
    })
  );
};

await visit(clientDirectory);

if (findings.length > 0) {
  for (const { marker, path: filePath } of findings) {
    console.error(
      `Forbidden server configuration marker in ${filePath}: ${marker}`
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    "Client output contains no server env names or 1Password references."
  );
}
