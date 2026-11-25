#!/usr/bin/env node
import { spawnSync } from "node:child_process";

import { Effect } from "effect";

import { formatProfile } from "./cli-output.js";
import { links, profile } from "./data.js";

const program = Effect.gen(function* cliProgram() {
  yield* Effect.sync(() =>
    process.stdout.write(`${formatProfile(profile, links)}\n`)
  );
});

const printInteractiveFallback = () => {
  Effect.runSync(program);
  process.stderr.write(
    "\nFor the interactive website, run: bunx --bun mynameistito\n"
  );
};

const interactive =
  process.stdin.isTTY &&
  process.stdout.isTTY &&
  !process.argv.includes("--plain");

const supportedRuntime =
  Boolean(process.versions.bun) ||
  (Number(process.versions.node.split(".")[0]) >= 26 &&
    process.execArgv.includes("--experimental-ffi"));

if (process.argv.includes("--help")) {
  process.stdout.write(
    "mynameistito — the portfolio in your terminal\n\nUse bunx --bun mynameistito for the interactive website.\n--site <url>  Use an alternate website origin\n--plain       Print the profile card\n--help        Show this help\n"
  );
} else if (interactive && supportedRuntime) {
  try {
    const { startTerminal } = await import("./terminal.js");
    const siteOption = process.argv.indexOf("--site", 2);
    const site = siteOption === -1 ? undefined : process.argv[siteOption + 1];

    if (siteOption !== -1 && (site === undefined || !URL.canParse(site))) {
      throw new Error("--site requires an absolute HTTP or HTTPS URL.");
    }

    await startTerminal({ site });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "ERR_MODULE_NOT_FOUND" ||
        error.code === "MODULE_NOT_FOUND")
    ) {
      printInteractiveFallback();
    } else {
      process.stderr.write(
        `Could not start the terminal interface: ${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exitCode = 1;
    }
  }
} else {
  const launch = interactive
    ? // oxlint-disable-next-line sonarjs/no-os-command-from-path -- Resolve the user's installed Bun runtime in the same way as the documented bunx command.
      spawnSync("bun", [process.argv[1], ...process.argv.slice(2)], {
        stdio: "inherit",
        windowsHide: true,
      })
    : undefined;

  if (launch !== undefined && launch.error === undefined) {
    process.exitCode = launch.status ?? 1;
  } else if (interactive) {
    printInteractiveFallback();
  } else {
    Effect.runSync(program);
  }
}
