import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

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
const LANG_EMOJI = {
  HTML: "🌐",
  JavaScript: "🟨",
  PowerShell: "💙",
  Python: "🐍",
  Shell: "🐚",
  TypeScript: "🔷",
};

const username = "mynameistito";

// Fetch pinned repos via GraphQL (these become the featured list)
const pinnedResult = execSync(
  `gh api graphql -f query='{ user(login: "${username}") { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name description url stargazerCount primaryLanguage { name } } } } } }'`,
  { env: { ...process.env } }
);
const pinnedData = JSON.parse(pinnedResult.toString());
const pinnedRepos = pinnedData.data.user.pinnedItems.nodes.map((r) => ({
  desc: r.description ?? r.name,
  emoji: LANG_EMOJI[r.primaryLanguage?.name] ?? "📦",
  name: r.name,
  stars: r.stargazerCount,
  url: r.url,
}));
const pinnedNames = new Set(pinnedRepos.map((r) => r.name));

// Fetch all public non-fork repos for auto-discovery padding
let repos = [];
let page = 1;
while (true) {
  const result = execSync(
    `gh api "users/${username}/repos?per_page=100&page=${page}"`,
    { env: { ...process.env } }
  );
  const page_repos = JSON.parse(result.toString());
  if (page_repos.length === 0) {
    break;
  }
  repos.push(...page_repos);
  if (page_repos.length < 100) {
    break;
  }
  page += 1;
}
repos = repos.filter((r) => !r.fork && !r.private);

// Auto-discovered public repos not already pinned
const autoRepos = repos
  .filter((r) => !SKIP.has(r.name) && !pinnedNames.has(r.name))
  .toSorted((a, b) => {
    if (b.stargazers_count !== a.stargazers_count) {
      return b.stargazers_count - a.stargazers_count;
    }
    return new Date(b.updated_at) - new Date(a.updated_at);
  })
  // Pad with up to 3 auto-discovered repos.
  .slice(0, 3)
  .map((r) => ({
    desc: r.description ?? r.name,
    emoji: LANG_EMOJI[r.language] ?? "📦",
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
