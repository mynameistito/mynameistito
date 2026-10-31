import type { PortfolioLink, PortfolioProfile } from "./data.js";

/**
 * Formats the public profile and its links for terminal output.
 *
 * @param profile - Public profile metadata.
 * @param links - Labeled links to include in the output.
 * @returns The formatted profile card.
 */
export const formatProfile = (
  profile: PortfolioProfile,
  links: readonly PortfolioLink[]
): string =>
  [
    `# ${profile.name}`,
    "",
    profile.description,
    "",
    ...links.map((link) => `- ${link.label}: ${link.url}`),
  ].join("\n");
