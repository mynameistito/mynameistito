export interface PortfolioLink {
  readonly label: string;
  readonly url: string;
}

export interface PortfolioProfile {
  readonly name: string;
  readonly description: string;
}

export const profile = {
  description:
    "Tito builds TypeScript CLIs, Cloudflare tools, browser extensions, and small useful internet things.",
  name: "My Name is Tito",
} as const satisfies PortfolioProfile;

export const links = [
  { label: "Website", url: "https://mynameistito.com" },
  { label: "GitHub", url: "https://github.com/mynameistito" },
  { label: "npm", url: "https://www.npmjs.com/~mynameistito" },
  { label: "X", url: "https://x.com/mynameistito" },
] as const satisfies readonly PortfolioLink[];
