import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { SiteControls } from "@/components/site-controls";
import { profile } from "@/lib/profile";

const links = [
  {
    label: "GitHub",
    detail: "Projects and open source",
    href: profile.github,
    mark: "GH",
  },
  { label: "X", detail: "Thoughts and updates", href: profile.x, mark: "𝕏" },
  {
    label: "Writing",
    detail: "Notes and longer-form writing",
    href: "https://mynameistito.com/writing",
    mark: "W",
  },
  {
    label: "Discord",
    detail: "Fastest way to reach me",
    href: profile.discord,
    mark: "D",
  },
  {
    label: "Signal",
    detail: "Message me privately",
    href: profile.signal,
    mark: "S",
  },
  { label: "KZG", detail: "Game servers", href: "https://kzg.com", mark: "K" },
  {
    label: "gamehostbros",
    detail: "Game server hosting",
    href: "https://gamehostbros.com",
    mark: "G",
  },
] as const;

const LinksPage = () => (
  <main className="page-shell-narrow flex min-h-dvh flex-col items-center pt-page-top pb-page-bottom sm:justify-center">
    <nav
      aria-label="Page controls"
      className="mb-12 flex w-full items-center justify-between"
    >
      <Link
        className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-text"
        to="/"
      >
        <ArrowLeft aria-hidden="true" size={14} /> Back to portfolio
      </Link>
      <SiteControls />
    </nav>
    <header className="mb-8 text-center">
      <Link
        aria-label="Visit Tito's portfolio"
        className="grid size-16 place-items-center overflow-hidden rounded-full border border-line"
        to="/"
      >
        <img
          alt=""
          className="size-full object-cover"
          height="64"
          src={profile.avatar}
          width="64"
        />
      </Link>
      <h1 className="mt-4 mb-1 text-xl font-semibold tracking-heading text-text">
        {profile.name}
      </h1>
      <p className="m-0 text-sm text-muted">@{profile.handle}</p>
    </header>
    <nav aria-label="Tito's links" className="grid w-full gap-2">
      {links.map((link) => (
        <a
          className="grid min-h-[58px] grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-control border border-line bg-surface px-3 transition-colors hover:border-line-strong hover:bg-surface-hover active:scale-[0.99]"
          href={link.href}
          key={link.label}
          rel="noreferrer"
          target="_blank"
        >
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-control border border-line-strong bg-surface-raised text-xs font-medium text-muted"
          >
            {link.mark}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-text">
              {link.label}
            </span>
            <span className="block truncate text-xs text-muted">
              {link.detail}
            </span>
          </span>
          <ArrowUpRight aria-hidden="true" className="text-subtle" size={14} />
          <span className="sr-only">Opens in a new tab</span>
        </a>
      ))}
    </nav>
    <p className="mt-7 mb-0 text-xs text-subtle">mynameistito.com</p>
  </main>
);

export const Route = createFileRoute("/links")({
  component: LinksPage,
  head: () => ({
    meta: [
      { title: "Links | Tito" },
      { content: "Find Tito around the web.", name: "description" },
    ],
  }),
});
