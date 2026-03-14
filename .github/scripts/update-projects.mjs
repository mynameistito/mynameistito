import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Repos to skip (forks, profile repo, uninteresting)
const SKIP = new Set([
  'mynameistito',
  'counter-strike_rules_and_regs',
  'CS2-Configs',
  'CSGO-CONFIGS',
  'movember-tracker',
  'ray-so',
  'opencode',
  'r2explorer',
  'opencode-config',
  'opencode-sync-plugin',
  'opencode-pty',
  'opencode-browserbase',
  'opencode-cloudflare',
  'opencode-skillful',
  'opencode-antigravity-auth',
  'opencode-anthropic-auth',
  'usage-bar',
  'socket-scan-archive',
  'quickscreen',
  'screenshotgun-app-v2',
  'Automated-Medication-Script-Emailer',
]);

// Hardcoded featured entries (used when a repo is private or the URL differs).
// These always appear first. Set url to homepage if it has one.
const FEATURED = [
  { name: 'justfuckingusecloudflare', url: 'https://justfuckingusecloudflare.com',  emoji: '⚡', desc: 'Stop paying seventeen different bills. Just use Cloudflare.' },
  { name: 'justfuckinguse.com',       url: 'https://justfuckinguse.com',             emoji: '🌐', desc: 'The no-bullshit hub for all "Just Fucking Use X" sites.' },
  { name: 'mcp-interceptor',          url: 'https://github.com/mynameistito/mcp-interceptor', emoji: '🔍', desc: 'Debug MCP requests in real-time with a live traffic proxy.' },
  { name: 'cloudflare-mcp',           url: 'https://github.com/mynameistito/cloudflare-mcp',  emoji: '☁️',  desc: 'Unofficial MCP server for the Cloudflare API.' },
  { name: 'CodexBar',                 url: 'https://codexbar.app',                   emoji: '📊', desc: 'Usage stats for OpenAI Codex and Claude Code, no login required.' },
  { name: 'portless',                 url: 'https://port1355.dev',                   emoji: '🔗', desc: 'Replace port numbers with stable named local URLs. For humans and agents.' },
  { name: 'better-context',           url: 'https://btca.dev',                       emoji: '🧠', desc: 'A better way to get up-to-date context on libraries in your projects.' },
  { name: 'repo-updater',             url: 'https://github.com/mynameistito/repo-updater',     emoji: '🔄', desc: 'Mass-update dependencies across multiple repos, auto-commit and open PRs.' },
  { name: 'claude-notifier',          url: 'https://github.com/mynameistito/claude-notifier',  emoji: '🔔', desc: 'Audible notifications for Claude Code on Windows. No dependencies, just beeps.' },
  { name: 'github-archiver',          url: 'https://github.com/mynameistito/github-archiver',  emoji: '🗃️', desc: 'Mass-archive GitHub repos with parallel processing.' },
  { name: 'cursor-rules',             url: 'https://github.com/mynameistito/cursor-rules',     emoji: '⚙️', desc: 'My Cursor rules and commands, open sourced.' },
];

// Emoji fallback by language
const LANG_EMOJI = {
  TypeScript: '🔷',
  JavaScript: '🟨',
  Python:     '🐍',
  Shell:      '🐚',
  PowerShell: '💙',
  HTML:       '🌐',
};

const username = 'mynameistito';
// Fetch all pages manually (--paginate returns concatenated JSON arrays)
let repos = [];
let page = 1;
while (true) {
  const result = execSync(
    `gh api "users/${username}/repos?per_page=100&page=${page}"`,
    { env: { ...process.env } }
  );
  const page_repos = JSON.parse(result.toString());
  if (page_repos.length === 0) break;
  repos.push(...page_repos);
  if (page_repos.length < 100) break;
  page++;
}
repos = repos.filter(r => !r.fork && !r.private);

// Build star map from public repos
const starMap = Object.fromEntries(repos.map(r => [r.name, r.stargazers_count]));
const featuredNames = new Set(FEATURED.map(f => f.name));

// Auto-discovered public repos not already in FEATURED
const autoRepos = repos
  .filter(r => !SKIP.has(r.name) && !featuredNames.has(r.name))
  .sort((a, b) => {
    if (b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count;
    return new Date(b.updated_at) - new Date(a.updated_at);
  })
  .slice(0, 3) // pad with up to 3 auto-discovered repos
  .map(r => ({
    name: r.name,
    url: r.homepage?.trim() || r.html_url,
    emoji: LANG_EMOJI[r.language] ?? '📦',
    desc: r.description ?? r.name,
    stars: r.stargazers_count,
  }));

const sorted = [
  ...FEATURED.map(f => ({ ...f, stars: starMap[f.name] ?? 0 })),
  ...autoRepos,
];

const lines = sorted
  .slice(0, 12)
  .map(({ name, url, emoji, desc, stars }) => {
    const starBadge = stars > 0 ? ` ⭐${stars}` : '';
    return `${emoji} **[${name}](${url})**${starBadge} — ${desc}`;
  })
  .join('\n\n');

const readme = readFileSync('README.md', 'utf8');
const updated = readme.replace(
  /<!-- AUTO-PROJECTS:START -->[\s\S]*?<!-- AUTO-PROJECTS:END -->/,
  `<!-- AUTO-PROJECTS:START -->\n${lines}\n<!-- AUTO-PROJECTS:END -->`
);

writeFileSync('README.md', updated);
console.log(`README updated: ${FEATURED.length} featured + ${autoRepos.length} auto-discovered = ${sorted.slice(0, 12).length} total.`);
