import { createFileRoute } from "@tanstack/react-router";

import { siteUrl, socialMeta } from "@/lib/social-meta";

const description = "A test page for a custom emoji on a Discord link button.";

const TestEmojiPage = () => (
  <main className="page-shell pt-page-top-header pb-page-bottom">
    <section className="mt-section grid max-w-prose gap-4">
      <p className="mb-0 text-xs leading-5 text-muted">Discord preview test</p>
      <h1 className="m-0 text-page-title leading-tight font-semibold tracking-title text-text">
        Custom emoji button test
      </h1>
      <p className="m-0 text-base leading-6 text-muted">
        Share this page in Discord to check whether the Discord link button
        shows the custom emoji.
      </p>
    </section>
  </main>
);

export const Route = createFileRoute("/test-emoji")({
  component: TestEmojiPage,
  head: () => ({
    links: [
      {
        href: new URL("/test-emoji-embed.json", siteUrl).href,
        rel: "discord:component-embed",
        type: "application/json",
      },
    ],
    meta: [
      { title: "Discord Emoji Test | Tito" },
      { content: description, name: "description" },
      ...socialMeta("Discord Emoji Test | Tito", description),
    ],
  }),
});
