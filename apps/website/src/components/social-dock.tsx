import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Github } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent } from "react";

import { profile } from "@/lib/profile";
import type { SocialProfileData } from "@/lib/social-profiles";
import { getSocialProfiles } from "@/server/functions/social-profiles";

const socialItems = [
  {
    label: "GitHub",
    Icon: Github,
    href: `https://github.com/${profile.github}`,
  },
  { label: "X", href: `https://x.com/${profile.x}`, mark: "𝕏" },
] as const;

type SocialItem = (typeof socialItems)[number];

// Public profile snapshots collected on 2026-10-08; refresh these with the graph data.
const fallbackGitHubContributionCount = 14_911;
const fallbackXProfileStats = { following: 1136, followers: 689 } as const;
const githubContributionGrid = [
  "00001131112111110113011422212211111011011101014111224",
  "00012131111111311112011132111122221113211111112211114",
  "00001121132111111112011322122122132114111211113111123",
  "00111131021111211212111241221112111112111111021112122",
  "01011121111111111121021231121121113113110111041111121",
  "00112111121112311112111232222222103112111111132111120",
  "00031110121112111121111321111111001112121110141111140",
] as const;

const fallbackGitHubOrganizations = [
  {
    name: "AWOEKN",
    avatar: "https://avatars.githubusercontent.com/u/97769475?v=4",
  },
  {
    name: "KZG-GameServers",
    avatar: "https://avatars.githubusercontent.com/u/117255818?v=4",
  },
] as const;

const GitHubHoverCard = ({
  data,
}: {
  readonly data: SocialProfileData["github"];
}) => {
  const weeks =
    data?.weeks ??
    Array.from({ length: 53 }, (_, week) =>
      githubContributionGrid.map((row) => Number(row[week] ?? 0))
    );
  const contributionCount =
    data?.totalContributions ?? fallbackGitHubContributionCount;
  const organizations = data?.organizations ?? fallbackGitHubOrganizations;

  return (
    <>
      <span className="social-hover-card-profile">
        <img
          alt=""
          height={40}
          src={data?.avatarUrl ?? profile.avatar}
          width={40}
        />
        <span>
          <strong>{data?.handle ?? profile.github}</strong>
          <span className="social-hover-card-detail">
            {contributionCount.toLocaleString()} contributions in the last year
          </span>
        </span>
      </span>
      <span className="social-hover-card-organizations">
        <span className="social-hover-card-label">Organizations</span>
        <span className="social-hover-card-org-list">
          {organizations.map((organization) => (
            <span className="social-hover-card-org" key={organization.name}>
              <img
                alt=""
                height={14}
                src={
                  "avatarUrl" in organization
                    ? organization.avatarUrl
                    : organization.avatar
                }
                width={14}
              />
              <span>@{organization.name}</span>
            </span>
          ))}
        </span>
      </span>
      <figure
        aria-label={`GitHub contribution graph, ${contributionCount.toLocaleString()} contributions in the last year`}
        className="social-hover-card-contribution-grid"
        style={
          // SAFETY: This object contains only the --week-count CSS custom property.
          { "--week-count": weeks.length } as CSSProperties
        }
      >
        {weeks.map((week, weekIndex) => (
          <span className="social-hover-card-contribution-week" key={weekIndex}>
            {week.map((level, day) => (
              <span
                aria-hidden="true"
                className="social-hover-card-contribution-day"
                data-level={level}
                key={`${weekIndex}-${day}`}
              />
            ))}
          </span>
        ))}
      </figure>
    </>
  );
};

const XHoverCard = ({ data }: { readonly data: SocialProfileData["x"] }) => (
  <>
    <span
      aria-hidden="true"
      className="social-hover-card-cover"
      // SAFETY: bannerUrl is parsed as HTTPS before reaching the UI; this is a CSS custom property.
      style={
        data?.bannerUrl
          ? ({ "--cover-image": `url("${data.bannerUrl}")` } as CSSProperties)
          : undefined
      }
    >
      <span>𝕏</span>
    </span>
    <span className="social-hover-card-x-profile">
      <img
        alt=""
        height={48}
        src={data?.avatarUrl ?? profile.avatar}
        width={48}
      />
      <span>
        <strong>{data?.name ?? profile.name}</strong>
        <span className="social-hover-card-detail">
          @{data?.handle ?? profile.x}
        </span>
      </span>
      <span className="social-hover-card-follow">Follow</span>
    </span>
    <span className="social-hover-card-bio">
      {data?.description || "👋 @KZG_AU | @gamehostbros"}
      {data?.location ? ` · ${data.location}` : " · New Zealand"}
    </span>
    <span className="social-hover-card-stats">
      <span>
        <strong>
          {(
            data?.following ?? fallbackXProfileStats.following
          ).toLocaleString()}
        </strong>{" "}
        Following
      </span>
      <span>
        <strong>
          {(
            data?.followers ?? fallbackXProfileStats.followers
          ).toLocaleString()}
        </strong>{" "}
        Followers
      </span>
    </span>
  </>
);

/** Renders the compact footer links on every route except the link hub.
 * @returns The social navigation, or nothing on the link hub.
 */
export const SocialDock = () => {
  const [activeItem, setActiveItem] = useState<SocialItem | null>(null);
  const [profileData, setProfileData] = useState<SocialProfileData | null>(
    null
  );
  const [panelLeft, setPanelLeft] = useState<number | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLAnchorElement | null>(null);
  const triggerRef = useRef<HTMLAnchorElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchActivationRef = useRef(false);
  const touchWasOpenRef = useRef(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    let isMounted = true;
    const loadProfiles = async () => {
      try {
        const data = await getSocialProfiles();
        if (isMounted) {
          setProfileData(data);
        }
      } catch {
        // Keep the dated public snapshot visible if the server request fails.
      }
    };
    void loadProfiles();
    return () => {
      isMounted = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (
      !activeItem ||
      !dockRef.current ||
      !panelRef.current ||
      !triggerRef.current
    ) {
      setPanelLeft(null);
      return;
    }

    const updatePanelPosition = () => {
      const panel = panelRef.current;
      const trigger = triggerRef.current;
      const dock = dockRef.current;
      if (!panel || !trigger || !dock) {
        return;
      }

      const panelWidth = panel.getBoundingClientRect().width;
      const triggerCenter =
        trigger.getBoundingClientRect().left + trigger.offsetWidth / 2;
      const minCenter = panelWidth / 2 + 12;
      const maxCenter = window.innerWidth - minCenter;
      const viewportCenter = Math.max(
        minCenter,
        Math.min(triggerCenter, maxCenter)
      );
      const position = viewportCenter - dock.getBoundingClientRect().left;
      panel.style.setProperty("--panel-left", `${position}px`);
      setPanelLeft(position);
    };

    updatePanelPosition();
    const observer = new ResizeObserver(updatePanelPosition);
    observer.observe(document.documentElement);
    observer.observe(dockRef.current);
    observer.observe(panelRef.current);
    observer.observe(triggerRef.current);
    return () => observer.disconnect();
  }, [activeItem]);

  if (pathname === "/links") {
    return null;
  }

  const cancelPendingClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const closePreview = () => {
    cancelPendingClose();
    setActiveItem(null);
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    if (
      !(event.relatedTarget instanceof Node) ||
      !dockRef.current?.contains(event.relatedTarget)
    ) {
      closePreview();
    }
  };

  const handleEscape = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      closePreview();
    }
  };

  const handlePointerLeave = (pointerType: string) => {
    if (pointerType === "mouse") {
      closeTimeoutRef.current = setTimeout(closePreview, 140);
    }
  };

  return (
    <nav
      aria-label="Portfolio links"
      className="social-dock fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-1 rounded-full border border-line bg-page/95 p-1.5 shadow-lg backdrop-blur"
      ref={dockRef}
    >
      {socialItems.map((item) => (
        <a
          aria-label={item.label}
          className="grid size-9 place-items-center rounded-full text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-text"
          href={item.href}
          key={item.label}
          onBlur={handleBlur}
          onClick={(event) => {
            if (touchActivationRef.current && !touchWasOpenRef.current) {
              event.preventDefault();
              setActiveItem(item);
              triggerRef.current = event.currentTarget;
            }
            touchActivationRef.current = false;
            touchWasOpenRef.current = false;
          }}
          onFocus={(event) => {
            setActiveItem(item);
            triggerRef.current = event.currentTarget;
          }}
          onKeyDown={handleEscape}
          onPointerDown={(event) => {
            touchActivationRef.current = event.pointerType === "touch";
            touchWasOpenRef.current = activeItem?.label === item.label;
          }}
          onPointerEnter={(event) => {
            cancelPendingClose();
            if (event.pointerType === "mouse") {
              setActiveItem(item);
              triggerRef.current = event.currentTarget;
            }
          }}
          onPointerLeave={(event) => handlePointerLeave(event.pointerType)}
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
        onBlur={handleBlur}
        onKeyDown={handleEscape}
        onPointerEnter={cancelPendingClose}
        onPointerLeave={(event) => handlePointerLeave(event.pointerType)}
        to="/links"
      >
        <ArrowUpRight aria-hidden="true" size={16} />
        <span className="sr-only">All links</span>
      </Link>
      {activeItem && (
        <a
          aria-hidden={panelLeft === null}
          className="social-hover-card"
          data-platform={activeItem.label.toLowerCase()}
          href={activeItem.href}
          onBlur={handleBlur}
          onKeyDown={handleEscape}
          onPointerEnter={cancelPendingClose}
          onPointerLeave={(event) => handlePointerLeave(event.pointerType)}
          ref={panelRef}
          rel="noreferrer"
          tabIndex={panelLeft === null ? -1 : 0}
          target="_blank"
        >
          {activeItem.label === "GitHub" ? (
            <GitHubHoverCard data={profileData?.github ?? null} />
          ) : (
            <XHoverCard data={profileData?.x ?? null} />
          )}
        </a>
      )}
    </nav>
  );
};
