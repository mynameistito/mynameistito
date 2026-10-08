import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Github } from "lucide-react";

import { profile } from "@/lib/profile";

const socialItems = [
  { label: "GitHub", Icon: Github, href: profile.github },
  { label: "X", href: profile.x, mark: "𝕏" },
] as const;

/** Renders the compact footer links on every route except the link hub.
 * @returns The social navigation, or nothing on the link hub.
 */
export const SocialDock = () => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  if (pathname === "/links") {
    return null;
  }

  return (
    <nav
      aria-label="Portfolio links"
      className="social-dock fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-1 rounded-full border border-line bg-page/95 p-1.5 shadow-lg backdrop-blur"
    >
      {socialItems.map((item) => (
        <a
          aria-label={item.label}
          className="grid size-9 place-items-center rounded-full text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-text"
          href={item.href}
          key={item.label}
          rel="noreferrer"
          target="_blank"
        >
          {"Icon" in item ? (
            <item.Icon aria-hidden="true" size={16} />
          ) : (
            <span aria-hidden="true">{item.mark}</span>
          )}
        </a>
      ))}
      <Link
        aria-label="Links"
        className="grid size-9 place-items-center rounded-full text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-text"
        to="/links"
      >
        <ArrowUpRight aria-hidden="true" size={16} />
        <span className="sr-only">All links</span>
      </Link>
    </nav>
  );
};
