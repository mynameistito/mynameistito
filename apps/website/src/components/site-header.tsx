import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SiteControls } from "@/components/site-controls";
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
    <header className="fixed inset-x-0 top-0 z-20 h-14 border-b border-line bg-page">
      <div className="page-shell flex h-full items-center justify-between">
        <Link
          className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-text"
          to={backTo}
        >
          <ArrowLeft aria-hidden="true" size={14} />
          {backLabel}
        </Link>
        <SiteControls />
      </div>
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
        <SiteControls />
      </nav>
    </header>
  );

export { siteHeader as SiteHeader };
