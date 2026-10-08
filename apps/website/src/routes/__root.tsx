import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import { NotFoundPage } from "@/components/not-found-page";
import { SocialDock } from "@/components/social-dock";
import { VisitorTracker } from "@/components/visitor-tracker";

import appCss from "@/styles.css?url";

if (import.meta.env.DEV && typeof window !== "undefined") {
  void import("react-grab");
}

const RootDocument = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <head>
      <HeadContent />
    </head>
    <body className="min-h-screen bg-page font-sans text-text antialiased">
      {children}
      <SocialDock />
      <VisitorTracker />
      <Scripts />
    </body>
  </html>
);

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
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
});
