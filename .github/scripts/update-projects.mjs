import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

import { Schema } from "effect";

// Repos to skip (forks, profile repo, uninteresting)
const SKIP = new Set([
  "mynameistito",
  "counter-strike_rules_and_regs",
  "CS2-Configs",
  "CSGO-CONFIGS",
  "movember-tracker",
  "ray-so",
  "opencode",
  "r2explorer",
  "opencode-config",
  "opencode-sync-plugin",
  "opencode-pty",
  "opencode-browserbase",
  "opencode-cloudflare",
  "opencode-skillful",
  "opencode-antigravity-auth",
  "opencode-anthropic-auth",
  "usage-bar",
  "socket-scan-archive",
  "quickscreen",
  "screenshotgun-app-v2",
  "Automated-Medication-Script-Emailer",
  "biome-check-write-repro",
]);

// Emoji fallback by language
/** @type {Readonly<Record<string, string>>} */
const LANG_EMOJI = {
  HTML: "🌐",
  JavaScript: "🟨",
  PowerShell: "💙",
  Python: "🐍",
  Shell: "🐚",
  TypeScript: "🔷",
};

const RepositorySchema = Schema.Struct({
  description: Schema.NullOr(Schema.String),
  fork: Schema.Boolean,
  html_url: Schema.String,
  language: Schema.NullOr(Schema.String),
  name: Schema.String,
  private: Schema.Boolean,
  stargazers_count: Schema.Number,
  updated_at: Schema.String,
});

const PinnedRepositoriesSchema = Schema.Struct({
  data: Schema.Struct({
    user: Schema.Struct({
      pinnedItems: Schema.Struct({
        nodes: Schema.Array(
          Schema.Struct({
            description: Schema.NullOr(Schema.String),
            name: Schema.String,
            primaryLanguage: Schema.NullOr(
              Schema.Struct({ name: Schema.String })
            ),
            stargazerCount: Schema.Number,
            url: Schema.String,
          })
        ),
      }),
    }),
  }),
});

const parsePinnedRepositories = Schema.decodeUnknownSync(
  Schema.fromJsonString(PinnedRepositoriesSchema)
);

const parseRepositoryPages = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Array(Schema.Array(RepositorySchema)))
);

const username = "mynameistito";

// Fetch pinned repos via GraphQL (these become the featured list)
const pinnedResult = execSync(
  `gh api graphql -f query='{ user(login: "${username}") { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name description url stargazerCount primaryLanguage { name } } } } } }'`,
  { env: { ...process.env } }
);

const pinnedData = parsePinnedRepositories(pinnedResult.toString());

const pinnedRepos = pinnedData.data.user.pinnedItems.nodes.map((r) => ({
  desc: r.description ?? r.name,
  emoji: LANG_EMOJI[r.primaryLanguage?.name ?? ""] ?? "📦",
  name: r.name,
  stars: r.stargazerCount,
  url: r.url,
}));

const pinnedNames = new Set(pinnedRepos.map((r) => r.name));

// Fetch all public non-fork repos for auto-discovery padding
const reposResult = execSync(
  `gh api --paginate --slurp "users/${username}/repos?per_page=100"`,
  { env: { ...process.env } }
);

const repos = parseRepositoryPages(reposResult.toString())
  .flat()
  .filter((r) => !r.fork && !r.private);

// Auto-discovered public repos not already pinned
const autoRepos = repos
  .filter((r) => !SKIP.has(r.name) && !pinnedNames.has(r.name))
  .toSorted((a, b) => {
    if (b.stargazers_count !== a.stargazers_count) {
      return b.stargazers_count - a.stargazers_count;
    }

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  })
  // Pad with up to 3 auto-discovered repos.
  .slice(0, 3)
  .map((r) => ({
    desc: r.description ?? r.name,
    emoji: LANG_EMOJI[r.language ?? ""] ?? "📦",
    name: r.name,
    stars: r.stargazers_count,
    url: r.html_url,
  }));

const sorted = [...pinnedRepos, ...autoRepos].toSorted(
  (a, b) => b.stars - a.stars
);

const lines = sorted
  .slice(0, 12)
  .map(({ name, url, emoji, desc, stars }) => {
    const starBadge = stars > 0 ? ` ⭐${stars}` : "";

    return `${emoji} **[${name}](${url})**${starBadge} — ${desc}`;
  })
  .join("\n\n");

const readme = readFileSync("README.md", "utf-8");

const updated = readme.replace(
  /<!-- AUTO-PROJECTS:START -->[\s\S]*?<!-- AUTO-PROJECTS:END -->/u,
  `<!-- AUTO-PROJECTS:START -->\n${lines}\n<!-- AUTO-PROJECTS:END -->`
);

writeFileSync("README.md", updated);

console.log(
  `README updated: ${pinnedRepos.length} pinned + ${autoRepos.length} auto-discovered = ${sorted.slice(0, 12).length} total.`
);
