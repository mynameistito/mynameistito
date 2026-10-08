#!/usr/bin/env node
import { Effect } from "effect";

import { links, profile } from "./data.js";

const output = [
  `# ${profile.name}`,
  "",
  profile.description,
  "",
  ...links.map((link) => link.url),
].join("\n");

Effect.runSync(Effect.sync(() => console.log(output)));
