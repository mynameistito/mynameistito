import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { profile } from "@/lib/profile";

const AboutPage = () => (
  <main className="page-shell pt-page-top-header pb-page-bottom">
    <SiteHeader backLabel="Portfolio" backTo="/" />
    <section className="mt-section grid max-w-prose gap-4">
      <p className="mb-0 text-xs leading-5 text-muted">Portfolio</p>
      <h1 className="m-0 text-page-title font-semibold leading-tight tracking-title text-text">
        About Akshar
      </h1>
      {profile.introduction.map((paragraph) => (
        <p className="m-0 text-base leading-6 text-muted" key={paragraph}>
          {paragraph}
        </p>
      ))}
      <Link
        className="mt-1 inline-flex text-sm text-text underline decoration-subtle underline-offset-4 transition-colors hover:decoration-accent"
        to="/contact"
      >
        Let&apos;s talk{" "}
        <ArrowUpRight aria-hidden="true" className="ml-1" size={14} />
      </Link>
    </section>
  </main>
);

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About | Akshar Patel" },
      { content: "About Akshar Patel.", name: "description" },
    ],
  }),
});
