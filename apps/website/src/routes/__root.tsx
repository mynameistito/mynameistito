import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import { NotFoundPage } from "@/components/not-found-page";
import { SocialDock } from "@/components/social-dock";

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
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRoute({
  head: () => ({
    links: [
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
        title: "Akshar Patel | apunlisted.com",
      },
      {
        content:
          "Akshar Patel is a data analyst, open-source contributor, and builder.",
        name: "description",
      },
    ],
  }),
  notFoundComponent: NotFoundPage,
  shellComponent: RootDocument,
});
