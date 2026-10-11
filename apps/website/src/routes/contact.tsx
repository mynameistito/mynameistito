import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { catch as catchEffect } from "effect/Effect";
import { ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { profile } from "@/lib/profile";
import { getTurnstileToken } from "@/lib/turnstile-client";
import { getTurnstileSitekey } from "@/server/functions/contact-turnstile-config";

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

const statusMessages: Record<SubmissionStatus, string> = {
  idle: "Messages go straight to my inbox.",
  submitting: "Sending your message.",
  success: "Thanks. I'll get back to you soon.",
  error: "Verification failed. Try again.",
};

const ContactPage = () => {
  const turnstileSitekey = Route.useLoaderData();
  const submissionInProgress = useRef(false);
  const [status, setStatus] = useState<SubmissionStatus>("idle");

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInProgress.current) {
      return;
    }

    if (!turnstileSitekey) {
      setStatus("error");
      return;
    }

    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    submissionInProgress.current = true;
    setStatus("submitting");

    const submission = Effect.tryPromise({
      try: async () => {
        const token = await getTurnstileToken(turnstileSitekey, "contact");
        return fetch("/api/contact", {
          body: JSON.stringify({
            message: values,
            turnstileToken: token,
          }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
      },
      catch: (cause) => cause,
    }).pipe(
      Effect.map((response) => response.ok),
      catchEffect(() => Effect.succeed(false))
    );
    const submit = async () => {
      const sent = await Effect.runPromise(submission);
      submissionInProgress.current = false;
      if (sent) {
        form.reset();
        setStatus("success");
      } else {
        setStatus("error");
      }
    };
    void submit();
  };

  const directMessages = [
    {
      label: "Discord",
      href: `https://discord.com/users/${profile.discord}`,
      detail: "Fastest way to reach me",
    },
    {
      label: "X",
      href: `https://x.com/messages/compose?recipient_id=${profile["x-dm"]}`,
      detail: "Send me a DM",
    },
    {
      label: "Signal",
      href: `https://signal.me/#eu/${profile.signal}`,
      detail: "Send me a message",
    },
  ] as const;
  const submitLabel = {
    idle: "Send message",
    submitting: "Sending",
    success: "Message sent",
    error: "Try again",
  }[status];

  return (
    <main className="page-shell pt-page-top-header pb-page-bottom">
      <section className="mt-section">
        <h1 className="m-0 text-page-title leading-tight font-semibold tracking-title text-text">
          Want to chat?
        </h1>
        <p className="mt-2 mb-0 text-base leading-6 text-muted">
          Send me a DM or leave a note below. Discord is the fastest.
        </p>
        <nav
          aria-label="Send me a DM"
          className="mt-4 grid gap-2 sm:grid-cols-3"
        >
          {directMessages.map((item) => (
            <a
              className="flex min-h-14 items-center justify-between gap-3 rounded-control border border-line bg-surface px-3 text-sm transition-colors hover:border-accent"
              href={item.href}
              key={item.label}
              rel="noreferrer"
              target="_blank"
            >
              <span>
                <span className="block font-medium text-text">
                  {item.label}
                </span>
                <span className="block text-xs text-muted">{item.detail}</span>
              </span>
              <ArrowUpRight
                aria-hidden="true"
                className="text-muted"
                size={14}
              />
            </a>
          ))}
        </nav>
      </section>

      <form
        aria-busy={status === "submitting"}
        className="mt-8 grid gap-5"
        onChange={() => {
          if (status === "success" || status === "error") {
            setStatus("idle");
          }
        }}
        onSubmit={sendMessage}
      >
        <label aria-hidden="true" className="hidden" htmlFor="company">
          Leave this field empty
          <input autoComplete="off" id="company" name="company" tabIndex={-1} />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-muted" htmlFor="name">
            Name
            <input
              autoComplete="name"
              className="h-11 rounded-control border border-line bg-surface px-3 text-sm text-text transition-colors outline-none focus:border-focus"
              id="name"
              maxLength={120}
              name="name"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-muted" htmlFor="email">
            Email
            <input
              autoComplete="email"
              className="h-11 rounded-control border border-line bg-surface px-3 text-sm text-text transition-colors outline-none focus:border-focus"
              id="email"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm text-muted" htmlFor="message">
          Message
          <textarea
            className="min-h-36 resize-y rounded-control border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-text transition-colors outline-none focus:border-focus"
            id="message"
            maxLength={5000}
            name="message"
            required
            rows={6}
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p
            aria-live="polite"
            className="m-0 max-w-[32ch] text-xs leading-5 text-muted"
            role={status === "error" ? "alert" : "status"}
          >
            {status === "idle" && !turnstileSitekey
              ? "Message verification is unavailable right now."
              : statusMessages[status]}
          </p>
          <button
            className="min-h-11 rounded-control bg-text px-4 text-sm font-semibold text-page transition-transform active:scale-[0.98] disabled:opacity-60"
            disabled={
              !turnstileSitekey ||
              status === "submitting" ||
              status === "success"
            }
            type="submit"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </main>
  );
};

export const Route = createFileRoute("/contact")({
  loader: () => getTurnstileSitekey(),
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact | Tito" },
      { content: "Get in touch with Tito.", name: "description" },
    ],
  }),
});
