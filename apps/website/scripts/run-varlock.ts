import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const [environment, ...args] = process.argv.slice(2);

if (environment !== "development" && environment !== "production") {
  throw new Error("Expected environment to be 'development' or 'production'.");
}

if (args.length === 0) {
  throw new Error("Expected a Varlock command.");
}

const varlockEntrypoint = fileURLToPath(
  new URL("../../../node_modules/varlock/bin/cli.js", import.meta.url)
);
const result = spawnSync(process.execPath, [varlockEntrypoint, ...args], {
  cwd: process.cwd(),
  env: { ...process.env, APP_ENV: environment },
  stdio: "inherit",
});

if (result.error) {
  throw new Error("Unable to start Varlock.", { cause: result.error });
}

process.exitCode = result.status ?? 1;
