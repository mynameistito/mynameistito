const paperAssets = "/paper-assets";

/** A project represented in the Paper portfolio. */
export interface Project {
  readonly name: string;
  readonly description: string;
  readonly languages: readonly string[];
  readonly image: string;
  readonly featured: boolean;
  readonly source: string;
  readonly demo?: string;
}

/** Projects are ordered to match the featured and other-projects sections. */
export const projects: readonly Project[] = [
  {
    name: "Radio Atlas",
    description:
      "Built an Omarchy plugin for exploring live radio on a rotatable globe, with country browsing, search, favorites, history, and integrated playback.",
    languages: ["QML", "Python"],
    image: `${paperAssets}/6DMVNJ8PFJ2YG5B3HKNKGNNZT8.webp`,
    featured: true,
    source: "https://github.com/AksharP5/omarchy-radio-atlas",
    demo: "https://omarchyplugins.com/plugin.html?id=akshar.radio-atlas",
  },
  {
    name: "blippy",
    description:
      "A keyboard-first GitHub client for maintainers to review pull requests, leave inline comments, and manage issues from the terminal.",
    languages: ["Rust", "Ratatui"],
    image: `${paperAssets}/6H9HFHM3BR7CBDJX67RAAY10VY.webp`,
    featured: true,
    source: "https://github.com/AksharP5/blippy",
  },
  {
    name: "Cohall",
    description:
      "Delegate work to your own devices through a coding agent. Ask your Mac to use Xcode from Linux, even if it needs to wait until the Mac comes online.",
    languages: ["TypeScript", "Node.js"],
    image: `${paperAssets}/5MB7S8ZA7XRVSMS4CARW05AQPB.webp`,
    featured: true,
    source: "https://github.com/AksharP5/cohall",
  },
  {
    name: "Bear Necessities Market",
    description:
      "Led the team that built a new reporting system for Western New England University's campus food pantry, part of the LibreFoodPantry open-source community.",
    languages: ["JavaScript", "Vue.js"],
    image: `${paperAssets}/3FT90RR0Y68NR3EEP92H5TWVCR.webp`,
    featured: true,
    source:
      "https://gitlab.com/LibreFoodPantry/client-solutions/bear-necessities-market",
  },
  {
    name: "ourPLCC",
    description:
      "Implemented LL(1) grammar validation and Paull's algorithm for a compiler toolkit used to teach programming-language concepts.",
    languages: ["Python", "Java"],
    image: `${paperAssets}/2AZXJ2JHPBP02H59YCT6797Y1D.webp`,
    featured: true,
    source: "https://github.com/ourPLCC",
  },
  {
    name: "Frameyard",
    description:
      "A local video and motion editor for Linux. Edit on the timeline or in JSX, with coding agents working on the same project files.",
    languages: ["TypeScript", "React"],
    image: `${paperAssets}/6TPPJ2FNH122HW5QCCHWZCJ62B.png`,
    featured: false,
    source: "https://github.com/AksharP5/frameyard",
  },
  {
    name: "Crayon melt",
    description:
      "An offline drawing toy where crayon marks thicken and drip, with adjustable wax melt, erasers, zoom, and an endlessly pannable canvas.",
    languages: ["JavaScript", "Canvas"],
    image: `${paperAssets}/106FVA2927182YH6VYS564YMHD.png`,
    featured: false,
    source: "https://github.com/AksharP5/crayon-melt",
  },
  {
    name: "Razer Battery",
    description:
      "An Omarchy bar plugin that shows Razer mouse battery and charging status, with low-battery alerts and one reader shared across monitors.",
    languages: ["QML", "Python"],
    image: `${paperAssets}/4FNHAWM6YRP735F53XYB1J06CE.png`,
    featured: false,
    source: "https://github.com/AksharP5/omarchy-razer-battery",
  },
  {
    name: "Relay",
    description:
      "Carry one coding task between the native Codex and OpenCode terminals without starting the conversation over.",
    languages: ["TypeScript", "Bun"],
    image: `${paperAssets}/3J4MYAEFJ153HXMKC41Y34J41B.png`,
    featured: false,
    source: "https://github.com/AksharP5/relay",
  },
  {
    name: "Hyfrme",
    description:
      "Created a copy-paste motion library for HyperFrames with 277 verified components, live customization, and a source-owning CLI workflow.",
    languages: ["HTML", "JavaScript"],
    image: `${paperAssets}/29HVFYRBD2REGB3DP7PKTYM2W8.webp`,
    featured: false,
    source: "https://github.com/AksharP5/hyfrme",
  },
  {
    name: "SkillSync",
    description:
      "Built a local-first tool that keeps AI agent skills, instructions, and Codex plugin profiles synchronized across devices through a private GitHub vault.",
    languages: ["JavaScript", "Node.js"],
    image: `${paperAssets}/4W7611EJ0N5V9J8GAAZY87TNNV.webp`,
    featured: false,
    source: "https://github.com/AksharP5/skillsync",
  },
  {
    name: "VoxType Blob",
    description:
      "A compact, voice-reactive Quickshell overlay theme for VoxType.",
    languages: ["QML", "Quickshell"],
    image: `${paperAssets}/7R04FCZS7D18DX0EBPGYECB0HK.png`,
    featured: false,
    source: "https://github.com/AksharP5/voxtype-blob",
  },
  {
    name: "tvctl",
    description:
      "Control a Roku TV from an AI chat, command line, or terminal remote.",
    languages: ["TypeScript", "Bun"],
    image: `${paperAssets}/7C8ED4JJ2FWVTW9ERJ86GEEQGD.png`,
    featured: false,
    source: "https://github.com/AksharP5/tvctl",
  },
  {
    name: "Assigned Issue PR Enforcer",
    description:
      "A GitHub Action that checks whether pull requests reference issues assigned to their authors.",
    languages: ["TypeScript", "GitHub Actions"],
    image: `${paperAssets}/35Z35JWEFCHXH1TC03GTRT81TT.png`,
    featured: false,
    source: "https://github.com/AksharP5/assigned-issue-pr-enforcer",
  },
  {
    name: "Patchline",
    description:
      "Developed a standalone Go CLI to manage plugin versions for OpenCode, including syncing, upgrading, and enabling fast recovery through rollback.",
    languages: ["Go", "JavaScript"],
    image: `${paperAssets}/1EXYMBK8M3SHPNCDSG84NEPX4N.webp`,
    featured: false,
    source: "https://github.com/AksharP5/Patchline",
  },
  {
    name: "spooky-idle.nvim",
    description:
      "A Neovim plugin that plays eerie sounds and shows ghostly ASCII art when you step away.",
    languages: ["Lua", "Neovim"],
    image: `${paperAssets}/5S6SKNR9C2AFW12BKZEJEKMAXG.png`,
    featured: false,
    source: "https://github.com/AksharP5/spooky-idle.nvim",
  },
  {
    name: "Find Fake Friends",
    description:
      "Built a privacy-first web app that analyzes Instagram data entirely in the browser with drag-and-drop ZIP upload.",
    languages: ["JavaScript", "HTML"],
    image: `${paperAssets}/77Y9RRRCYESQ47Z2M90JNMC9E0.webp`,
    featured: false,
    source: "https://github.com/AksharP5/FindFakeFriends",
  },
  {
    name: "Packaged Resume",
    description:
      "Developed an interactive command-line resume distributed as an npm package, with formatted text, JSON, and QR code output modes.",
    languages: ["Node.js", "JavaScript"],
    image: `${paperAssets}/0A3YGCVKKKMG0M55RR4P30QF2S.webp`,
    featured: false,
    source: "https://github.com/AksharP5/akshar-resume",
  },
  {
    name: "Get Spotify Stats",
    description:
      "A Flask website for Spotify account statistics, trending music, and personalized song recommendations.",
    languages: ["Python", "Flask"],
    image: `${paperAssets}/19G3DN53B4HXKC3P2K19JVRSZY.webp`,
    featured: false,
    source: "https://github.com/AksharP5/GetSpotifyStats",
  },
];

/** Returns a stable URL-safe route segment for a project.
 * @param name - The project name.
 * @returns A URL-safe project slug.
 */
export const projectSlug = (name: string) =>
  name.toLowerCase().replaceAll(" ", "-").replaceAll(".", "-");

/** Looks up the source URL for a project.
 * @param name - The project name.
 * @returns The repository URL, or a GitHub search if a URL is not recorded.
 */
export const projectSourceUrl = (name: string) =>
  projects.find((project) => project.name === name)?.source ??
  `https://github.com/search?q=${encodeURIComponent(name)}&type=repositories`;
