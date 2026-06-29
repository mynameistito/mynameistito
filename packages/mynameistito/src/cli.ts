#!/usr/bin/env node
import { Box, Text, createCliRenderer } from "@opentui/core";

import { links, packages, profile, projects } from "./data.js";

const accent = "#f38020";
const cyan = "#00d4ff";
const muted = "#8b949e";
const white = "#f0f6fc";

const formatStars = (stars?: number): string =>
  stars && stars > 0 ? `  star ${stars}` : "";

const renderCards = (
  items: readonly {
    readonly name: string;
    readonly description: string;
    readonly url: string;
    readonly stars?: number;
  }[]
) =>
  items.map((item) =>
    Box(
      {
        borderColor: "#30363d",
        borderStyle: "rounded",
        flexDirection: "column",
        height: 6,
        marginBottom: 1,
        padding: 1,
        width: "100%",
      },
      Text({
        content: `${item.name}${formatStars(item.stars)}`,
        fg: cyan,
        height: 1,
      }),
      Text({ content: item.description, fg: white, height: 1 }),
      Text({ content: item.url, fg: muted, height: 1 })
    )
  );

const renderLinks = () =>
  links.map((link) =>
    Box(
      { flexDirection: "row", gap: 1 },
      Text({ content: `${link.label}:`, fg: cyan, height: 1 }),
      Text({ content: link.url, fg: muted, height: 1 })
    )
  );

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
});

renderer.root.add(
  Box(
    {
      borderColor: accent,
      borderStyle: "rounded",
      flexDirection: "column",
      gap: 1,
      padding: 1,
      width: "100%",
    },
    Text({ content: profile.handle, fg: accent, height: 1 }),
    Text({ content: profile.name, fg: muted, height: 1 }),
    Text({ content: profile.headline, fg: white, height: 1 }),
    Text({ content: "GitHub projects", fg: accent, height: 1 }),
    ...renderCards(projects),
    Text({ content: "npm packages", fg: accent, height: 1 }),
    ...renderCards(packages),
    Text({ content: "links", fg: accent, height: 1 }),
    ...renderLinks(),
    Text({ content: "Press Ctrl+C to exit", fg: muted, height: 1 })
  )
);
