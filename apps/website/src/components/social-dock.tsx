import { Link, useRouterState } from "@tanstack/react-router";

import { profile } from "@/lib/profile";

const socialItems = [
  { label: "GitHub", text: "GH", href: profile.github },
  { label: "LinkedIn", text: "in", href: profile.linkedin },
  { label: "X", text: "𝕏", href: profile.x },
  { label: "YouTube", text: "▶", href: profile.youtube },
  { label: "Resume", text: "CV", href: profile.resume },
] as const;

/** Fixed social navigation matching the compact reference-site footer.
 * @returns The social dock.
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
          {item.text}
        </a>
      ))}
      <Link
        aria-label="Links"
        className="grid size-9 place-items-center rounded-full text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-text"
        to="/links"
      >
        ↗
      </Link>
    </nav>
  );
};
