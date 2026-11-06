import {
  ArrowUpRight,
  Check,
  GitBranch,
  Package,
  Terminal,
} from "lucide-react";

type Scene = "profile" | "projects" | "packages" | "contributions";

const stories = {
  profile: {
    label: "A little introduction, from the terminal.",
    title: "mynameistito — terminal",
    eyebrow: "Developer · New Zealand",
    command: "npx mynameistito",
    result: "Hey, I'm Tito.",
    detail: "Tools, services, and experiments.",
    Icon: Terminal,
    note: "Also available in your terminal",
  },
  projects: {
    label: "From an idea to a tool you can use.",
    title: "mynameistito / projects",
    eyebrow: "Build something useful",
    command: "create-cf-token",
    result: "One less thing to configure.",
    detail: "A guided CLI for Cloudflare API tokens.",
    Icon: GitBranch,
    note: "Explore the projects below",
  },
  packages: {
    label: "Small tools. One command away.",
    title: "npm — terminal",
    eyebrow: "Published on npm",
    command: "npx mynameistito",
    result: "Meet Tito in your terminal.",
    detail: "A tiny terminal profile card.",
    Icon: Package,
    note: "Find your next tool below",
  },
  contributions: {
    label: "Open source is a conversation.",
    title: "contributions / workflow",
    eyebrow: "The contribution cycle",
    command: "branch → commit → pull request",
    result: "Make a small improvement.",
    detail: "Share the change. Learn from the review.",
    Icon: GitBranch,
    note: "Browse real contributions below",
  },
} as const;

/** A decorative, static product composition; all real controls live outside it.
 * @returns A responsive illustration and its accessible caption.
 */
export const PortfolioScene = ({ scene }: { readonly scene: Scene }) => {
  const story = stories[scene];
  const { Icon } = story;

  return (
    <figure className="portfolio-scene">
      <div className="portfolio-scene-stage" aria-hidden="true">
        <div className="portfolio-scene-window">
          <div className="portfolio-scene-chrome">
            <span className="portfolio-scene-lights">
              <span />
              <span />
              <span />
            </span>
            <span>{story.title}</span>
          </div>
          <div className="portfolio-scene-content">
            <div className="portfolio-scene-eyebrow">
              <Icon size={14} />
              {story.eyebrow}
            </div>
            <div className="portfolio-scene-command">
              <span>❯</span>
              <code>{story.command}</code>
            </div>
            <strong>{story.result}</strong>
            <p>{story.detail}</p>
            <div className="portfolio-scene-rule" />
            <div className="portfolio-scene-footer">
              <Check size={14} />
              <span>
                {scene === "contributions"
                  ? "Build together"
                  : "TypeScript · Open source"}
              </span>
              <ArrowUpRight size={14} />
            </div>
            <div className="portfolio-scene-filler">
              <span />
              <span />
            </div>
          </div>
        </div>
        <div className="portfolio-scene-note">
          <Icon size={16} />
          <span>{story.note}</span>
        </div>
      </div>
      <figcaption>{story.label}</figcaption>
    </figure>
  );
};
