import path from "node:path";

const artifactDirectory = Bun.env.ALCHEMY_E2E_ARTIFACT;
if (!artifactDirectory) {
  throw new Error("ALCHEMY_E2E_ARTIFACT is required");
}

const projectRoot = path.resolve(import.meta.dir, "..");
const build = await Bun.build({
  entrypoints: [
    path.join(projectRoot, "apps/website/src/lib/visitor-counter.ts"),
  ],
  external: ["cloudflare:workers"],
  naming: "visitor-counter.js",
  outdir: artifactDirectory,
  target: "browser",
});

if (!build.success) {
  throw new AggregateError(
    build.logs,
    "Failed to build the E2E Durable Object module"
  );
}

await Bun.write(
  path.join(artifactDirectory, "e2e-worker.js"),
  [
    'import app from "./server/server.js";',
    'export { VisitorCounter } from "./visitor-counter.js";',
    "export default app;",
    "",
  ].join("\n")
);
