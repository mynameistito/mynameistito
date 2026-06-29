export interface PortfolioLink {
  readonly label: string;
  readonly url: string;
}

export interface PortfolioProject {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly stars?: number;
  readonly tag: "cli" | "web" | "extension" | "config" | "package";
}

export interface PortfolioPackage {
  readonly name: string;
  readonly description: string;
  readonly url: string;
}

export interface PortfolioProfile {
  readonly handle: string;
  readonly name: string;
  readonly headline: string;
  readonly location: string;
}

export const profile = {
  handle: "mynameistito",
  headline:
    "TypeScript, Cloudflare, CLIs, terminal tools, and small useful internet things.",
  location: "Internet",
  name: "Tito",
} as const satisfies PortfolioProfile;

export const projects = [
  {
    description: "Guided CLI for creating Cloudflare API user tokens.",
    name: "create-cf-token",
    stars: 44,
    tag: "cli",
    url: "https://github.com/mynameistito/create-cf-token",
  },
  {
    description:
      "A blunt Cloudflare-first guide for shipping without infra theater.",
    name: "justfuckingusecloudflare",
    stars: 22,
    tag: "web",
    url: "https://github.com/mynameistito/justfuckingusecloudflare",
  },
  {
    description:
      "Mass-update dependencies across multiple repositories and open PRs.",
    name: "repo-updater",
    stars: 6,
    tag: "cli",
    url: "https://github.com/mynameistito/repo-updater",
  },
  {
    description: "OpenCode TUI plugin for AI provider usage limits.",
    name: "oc-usage-limits-plugin",
    stars: 6,
    tag: "package",
    url: "https://github.com/mynameistito/oc-usage-limits-plugin",
  },
  {
    description:
      "Per-tab volume control with up to 600% boost for Chrome and Firefox.",
    name: "volume-master",
    stars: 2,
    tag: "extension",
    url: "https://github.com/mynameistito/volume-master",
  },
  {
    description: "CLI for inspecting Codex usage windows and reset credits.",
    name: "codex-usage",
    stars: 1,
    tag: "cli",
    url: "https://github.com/mynameistito/codex-usage",
  },
] as const satisfies readonly PortfolioProject[];

export const packages = [
  {
    description: "Create Cloudflare API tokens from your terminal.",
    name: "create-cf-token",
    url: "https://www.npmjs.com/package/create-cf-token",
  },
  {
    description: "Dependency update automation for local git repos.",
    name: "repo-updater",
    url: "https://www.npmjs.com/package/repo-updater",
  },
  {
    description: "Inspect Codex usage limits and reset windows.",
    name: "codex-usage",
    url: "https://www.npmjs.com/package/codex-usage",
  },
] as const satisfies readonly PortfolioPackage[];

export const links = [
  { label: "GitHub", url: "https://github.com/mynameistito" },
  { label: "X", url: "https://x.com/mynameistito" },
  { label: "Bluesky", url: "https://bsky.app/profile/mynameistito.com" },
  { label: "Twitch", url: "https://twitch.tv/mynameistito_" },
  { label: "YouTube", url: "https://youtube.com/@mynameistito" },
  { label: "Figma", url: "https://www.figma.com/@mynameistito" },
] as const satisfies readonly PortfolioLink[];
