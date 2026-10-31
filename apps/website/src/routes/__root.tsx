import {
  Link,
  HeadContent,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";

import { NotFoundPage } from "@/components/not-found-page";
import { SiteHeader } from "@/components/site-header";
import { SocialDock } from "@/features/social/components/dock";
import { socialMeta } from "@/features/social/meta";
import { VisitorTracker } from "@/features/visitors/components/tracker";

import appCss from "@/styles.css?url";

if (import.meta.env.DEV && typeof window !== "undefined") {
  try {
    await import("react-grab");
  } catch (error) {
    console.error("Unable to load the React Grab development helper.", error);
  }
}

const RootDocument = ({ children }: { children: React.ReactNode }) => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const isHome = pathname === "/" || pathname === "/links";
  const isProjectIndex = pathname === "/projects" || pathname === "/projects/";
  const isProjectDetail = pathname.startsWith("/projects/") && !isProjectIndex;
  const backLabel = isProjectDetail ? "Projects" : "Home";
  const headerLabel = isProjectIndex ? "Portfolio" : backLabel;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-page font-sans text-text antialiased">
        <VisitorTracker>
          {!isHome && (
            <SiteHeader
              backLabel={headerLabel}
              backTo={isProjectDetail ? "/projects" : "/"}
            />
          )}
          {children}
          <SocialDock />
        </VisitorTracker>
        <footer className="page-shell pb-4 text-center">
          <Link
            className="text-xs text-muted transition-colors hover:text-text"
            to="/privacy"
          >
            Privacy
          </Link>
        </footer>
        <Scripts />
      </body>
    </html>
  );
};

export const Route = createRootRoute({
  head: () => ({
    links: [
      {
        href: "/assets/avatar.png",
        rel: "icon",
        type: "image/png",
      },
      {
        href: appCss,
        rel: "stylesheet",
      },
    ],
    meta: [
      {
        charSet: "utf-8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "Tito | mynameistito.com",
      },
      {
        content:
          "Tito is a developer from New Zealand who likes messing with things and seeing where they go.",
        name: "description",
      },
      ...socialMeta(
        "Tito | mynameistito.com",
        "Tito is a developer from New Zealand who likes messing with things and seeing where they go."
      ),
    ],
    scripts: [
      {
        children:
          "try{document.documentElement.dataset.theme=localStorage.getItem('theme')==='light'?'light':'dark'}catch{}",
      },
      {
        async: true,
        defer: true,
        src: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
});
