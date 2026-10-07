import { Link } from "@tanstack/react-router";

import { profile } from "@/lib/profile";

interface SiteHeaderProps {
  backTo?: "/" | "/projects";
  backLabel?: "Portfolio" | "Projects" | "Home";
}

/** Renders the shared navigation used by every portfolio page.
 * @returns The page header.
 */
const siteHeader = ({ backTo, backLabel }: SiteHeaderProps) =>
  backTo && backLabel ? (
    <header className="flex min-h-8 items-center border-b border-line pb-4">
      <Link
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-text"
        to={backTo}
      >
        <span aria-hidden="true" className="text-base leading-none">
          ←
        </span>
        {backLabel}
      </Link>
    </header>
  ) : (
    <header className="flex min-h-12 items-center justify-between gap-4 border-b border-line pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <img
          alt=""
          className="size-[46px] shrink-0 rounded-full border border-line object-cover"
          height="46"
          src={profile.avatar}
          width="46"
        />
        <div className="min-w-0">
          <p className="m-0 flex items-center gap-1 text-base font-semibold leading-header tracking-heading text-text">
            {profile.name}
            <img
              alt="Verified"
              className="size-[19px]"
              height="19"
              src={profile.verifiedMark}
              width="19"
            />
          </p>
          <p className="m-0 truncate text-profile leading-header text-muted">
            {profile.subtitle}
          </p>
        </div>
      </div>
      <nav
        aria-label="Social links"
        className="flex shrink-0 items-center gap-1"
      >
        <span className="mr-1 inline-flex h-[30px] items-center gap-1 rounded-control border border-line bg-surface px-2 text-micro text-muted">
          <span aria-hidden="true">◉</span> 299
        </span>
        <a
          aria-label="GitHub"
          className="grid size-[30px] place-items-center rounded-control border border-line bg-surface text-xs text-muted transition-colors hover:text-text"
          href={profile.github}
          rel="noreferrer"
          target="_blank"
        >
          GH
        </a>
        <a
          aria-label="X"
          className="grid size-[30px] place-items-center rounded-control border border-line bg-surface text-xs text-muted transition-colors hover:text-text"
          href={profile.x}
          rel="noreferrer"
          target="_blank"
        >
          𝕏
        </a>
      </nav>
    </header>
  );

export { siteHeader as SiteHeader };
