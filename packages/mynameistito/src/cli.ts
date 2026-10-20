#!/usr/bin/env node
import { Effect } from "effect";

import { formatProfile } from "./cli-output.js";
import { links, profile } from "./data.js";

const program = Effect.gen(function* cliProgram() {
  yield* Effect.sync(() =>
    process.stdout.write(`${formatProfile(profile, links)}\n`)
  );
});

Effect.runSync(program);
