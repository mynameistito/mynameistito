import { createFileRoute } from "@tanstack/react-router";

import { profile } from "@/lib/profile";

const AboutPage = () => (
  <main className="page-shell pt-page-top-header pb-page-bottom">
    <section className="mt-section grid max-w-prose gap-4">
      <p className="mb-0 text-xs leading-5 text-muted">About</p>
      <h1 className="m-0 text-page-title font-semibold leading-tight tracking-title text-text">
        About Tito
      </h1>
      {profile.introduction.map((paragraph) => (
        <p className="m-0 text-base leading-6 text-muted" key={paragraph}>
          {paragraph}
        </p>
      ))}
    </section>
  </main>
);

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About | Tito" },
      {
        content: "About Tito, a developer from New Zealand.",
        name: "description",
      },
    ],
  }),
});
