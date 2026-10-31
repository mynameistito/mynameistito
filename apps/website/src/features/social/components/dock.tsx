import { Link, useRouterState } from "@tanstack/react-router";
import { Effect } from "effect";
import { catch as catchEffect } from "effect/Effect";
import { ArrowUpRight, ChartColumnIncreasing } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, SVGProps } from "react";

import { profile } from "@/domain/profile";
import { buildCalendar } from "@/features/ai-usage/analytics";
import type { SocialProfileData } from "@/features/social/profiles";
import { getSocialProfiles } from "@/server/functions/social-profiles";

type GithubMarkProps = SVGProps<SVGSVGElement> & { readonly size?: number };

const GithubMark = ({ size = 16, ...props }: GithubMarkProps) => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    height={size}
    viewBox="0 0 24 24"
    width={size}
    {...props}
  >
    <path d="M12 .297a12 12 0 0 0-3.79 23.4c.6.111.82-.26.82-.577v-2.234c-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.605-2.665-.3-5.467-1.332-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 6.003 0c2.29-1.552 3.296-1.23 3.296-1.23.653 1.653.242 2.873.12 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.625-5.48 5.92.43.37.823 1.102.823 2.222v3.293c0 .32.216.694.825.576A12.003 12.003 0 0 0 12 .297" />
  </svg>
);

const socialItems = [
  {
    label: "GitHub",
    Icon: GithubMark,
    href: `https://github.com/${profile.github}`,
  },
  { label: "X", href: `https://x.com/${profile.x}`, mark: "𝕏" },
  { label: "Tokscale", Icon: ChartColumnIncreasing, href: "/ai" },
] as const;

type SocialItem = (typeof socialItems)[number];

// Public profile snapshots collected on 2026-10-13; refresh these with the graph data.
const fallbackGitHubContributionCount = 15_486;
const fallbackXProfileStats = { following: 1136, followers: 689 } as const;

const githubContributionGrid = [
  "00021311121111101130114222122111110110111010141112242",
  "00131311111114111230112331121222311142111111122211241",
  "00011211322111111120113221221231321141122111131111231",
  "11111310211112112121112412211121111121111110211121320",
  "00111311211111111210212312211211131131101110421111210",
  "01121111211123111121113323222221031122111111321111230",
  "00311101211121111211113211111110011231211101421111320",
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
            {contributionCount.toLocaleString()} contributions in the last 12
            months
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
        aria-label={`GitHub contribution graph, ${contributionCount.toLocaleString()} contributions in the last 12 months`}
        className="social-hover-card-contribution-grid"
        style={{ "--week-count": weeks.length }}
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
      style={
        data?.bannerUrl === undefined ||
        data.bannerUrl === null ||
        data.bannerUrl.length === 0
          ? undefined
          : { "--cover-image": `url("${data.bannerUrl}")` }
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
      {data?.description ?? "👋 @KZG_AU | @gamehostbros"}
      {data?.location !== undefined && data.location.length > 0
        ? ` · ${data.location}`
        : " · New Zealand"}
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

const TokscaleHoverCard = ({
  data,
}: {
  readonly data: SocialProfileData["tokscale"];
}) => {
  if (!data) {
    return (
      <span className="social-hover-card-empty">
        <strong>AI usage</strong>
        <span className="social-hover-card-detail">
          Usage data is updating. Open the dashboard for the latest snapshot.
        </span>
        <span className="social-hover-card-link">
          View AI dashboard <ArrowUpRight aria-hidden="true" size={13} />
        </span>
      </span>
    );
  }

  const weeks = buildCalendar(data.contributions);
  const count = data.stats.totalTokens;

  return (
    <>
      <span className="social-hover-card-profile">
        <img alt="" height={40} src={profile.avatar} width={40} />
        <span>
          <strong>{profile.name}</strong>
          <span className="social-hover-card-detail">@{profile.tokscale}</span>
        </span>
      </span>
      <span className="social-hover-card-detail">
        {count.toLocaleString()} tokens · $
        {data.stats.totalCost.toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })}{" "}
        estimated spend · {data.stats.activeDays.toLocaleString()} active days
      </span>
      <figure
        aria-label="Tokscale token usage heatmap for the last year"
        className="social-hover-card-contribution-grid"
        style={{ "--week-count": weeks.length }}
      >
        {weeks.map((week, weekIndex) => (
          <span className="social-hover-card-contribution-week" key={weekIndex}>
            {week.map((day, dayIndex) => (
              <span
                aria-hidden="true"
                className="social-hover-card-contribution-day"
                data-level={day?.intensity ?? 0}
                key={`${weekIndex}-${dayIndex}`}
              />
            ))}
          </span>
        ))}
      </figure>
      <span className="social-hover-card-link">
        View AI dashboard <ArrowUpRight aria-hidden="true" size={13} />
      </span>
    </>
  );
};

/** Selects the hover-card content for a social provider.
 * @param item - The active social link.
 * @param data - The loaded public profile data.
 * @returns The active provider's matching preview.
 */
const renderSocialPreview = (
  item: SocialItem,
  data: SocialProfileData | null
) => {
  if (item.label === "GitHub") {
    return <GitHubHoverCard data={data?.github ?? null} />;
  }

  if (item.label === "X") {
    return <XHoverCard data={data?.x ?? null} />;
  }

  return <TokscaleHoverCard data={data?.tokscale ?? null} />;
};

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

    const profiles = Effect.tryPromise(
      async () => await getSocialProfiles()
    ).pipe(catchEffect(() => Effect.succeed(null)));

    const loadProfiles = async () => {
      const data = await Effect.runPromise(profiles);

      if (isMounted && data) {
        setProfileData(data);
      }
    };

    void loadProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  useLayoutEffect(() => {
    let observer: ResizeObserver | undefined;

    if (
      activeItem === null ||
      !dockRef.current ||
      !panelRef.current ||
      !triggerRef.current
    ) {
      setPanelLeft(null);
    } else {
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
      observer = new ResizeObserver(updatePanelPosition);
      observer.observe(document.documentElement);
      observer.observe(dockRef.current);
      observer.observe(panelRef.current);
      observer.observe(triggerRef.current);
    }

    return () => observer?.disconnect();
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
      dockRef.current?.contains(event.relatedTarget) !== true
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
          onPointerLeave={(event) => {
            handlePointerLeave(event.pointerType);
          }}
          rel={item.href.startsWith("/") ? undefined : "noreferrer"}
          target={item.href.startsWith("/") ? undefined : "_blank"}
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
        onPointerLeave={(event) => {
          handlePointerLeave(event.pointerType);
        }}
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
          onPointerLeave={(event) => {
            handlePointerLeave(event.pointerType);
          }}
          ref={panelRef}
          rel={activeItem.href.startsWith("/") ? undefined : "noreferrer"}
          tabIndex={panelLeft === null ? -1 : 0}
          target={activeItem.href.startsWith("/") ? undefined : "_blank"}
        >
          {renderSocialPreview(activeItem, profileData)}
        </a>
      )}
    </nav>
  );
};
