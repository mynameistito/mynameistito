type Scene = "profile" | "projects" | "packages" | "contributions";

const stories = {
  profile: {
    title: "mynameistito — terminal",
    command: "npx mynameistito",
    result: "Hey, I'm Tito.",
    detail: "Tools, services, and experiments.",
  },
  projects: {
    title: "mynameistito / projects",
    command: "create-cf-token",
    result: "Cloudflare API tokens",
    detail: "A guided CLI for Cloudflare API tokens.",
  },
  packages: {
    title: "npm — terminal",
    command: "npx mynameistito",
    result: "Meet Tito in your terminal.",
    detail: "A tiny terminal profile card.",
  },
  contributions: {
    title: "contributions / workflow",
    command: "branch → commit → pull request",
    result: "Pull requests",
    detail: "Share the change. Learn from the review.",
  },
} as const;

/** A compact terminal example for the current page.
 * @returns The terminal panel.
 */
export const PortfolioScene = ({ scene }: { readonly scene: Scene }) => {
  const story = stories[scene];

  return (
    <div className="portfolio-scene">
      <div className="portfolio-scene-chrome">{story.title}</div>
      <div className="portfolio-scene-content">
        <div className="portfolio-scene-command">
          <span aria-hidden="true">❯</span>
          <code>{story.command}</code>
        </div>
        <strong>{story.result}</strong>
        <p>{story.detail}</p>
      </div>
    </div>
  );
};
