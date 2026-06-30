#!/usr/bin/env node
import { links, profile } from "./data.js";

const output = [
  `# ${profile.name}`,
  "",
  profile.description,
  "",
  ...links.map((link) => link.url),
].join("\n");

console.log(output);
