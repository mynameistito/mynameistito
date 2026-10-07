import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import { SiteHeader } from "@/components/site-header";
import { profile } from "@/lib/profile";

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

const statusMessages: Record<SubmissionStatus, string> = {
  idle: "Messages go straight to my inbox.",
  submitting: "Sending your message.",
  success: "Thanks. I'll get back to you soon.",
  error: "That didn't send. Try again in a moment.",
};
const buttonLabels: Record<SubmissionStatus, string> = {
  idle: "Send message",
  submitting: "Sending",
  success: "Message sent",
  error: "Try again",
};

const ContactPage = () => {
  const submissionInProgress = useRef(false);
  const [status, setStatus] = useState<SubmissionStatus>("idle");

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionInProgress.current) {
      return;
    }

    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      setStatus("error");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("access_key", accessKey);
    formData.set("subject", "New message from your portfolio");
    formData.set("from_name", "Akshar's Portfolio");
    submissionInProgress.current = true;
    setStatus("submitting");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        body: formData,
        method: "POST",
      });
      if (response.ok) {
        form.reset();
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
    submissionInProgress.current = false;
  };

  return (
    <main className="mx-auto w-[min(100%-48px,644px)] pt-20 pb-24 sm:pt-24">
      <SiteHeader backLabel="Home" backTo="/" />
      <section className="mt-7">
        <h1 className="m-0 text-page-title font-semibold leading-tight tracking-title text-text">
          Let&apos;s talk.
        </h1>
        <p className="mt-2 mb-0 text-base leading-6 text-muted">
          Send me a note below. I usually reply faster on X.
        </p>
        <a
          className="mt-4 inline-flex min-h-9 items-center rounded-control border border-line bg-surface px-3 text-sm font-medium text-text transition-colors hover:border-accent"
          href={profile.xDirectMessage}
          rel="noreferrer"
          target="_blank"
        >
          DM on X{" "}
          <span aria-hidden="true" className="ml-2 text-muted">
            ↗
          </span>
        </a>
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
        <input
          aria-hidden="true"
          autoComplete="off"
          className="hidden"
          name="botcheck"
          tabIndex={-1}
          type="checkbox"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-muted" htmlFor="name">
            Name
            <input
              autoComplete="name"
              className="h-11 rounded-control border border-line bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-focus"
              id="name"
              name="name"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-muted" htmlFor="email">
            Email
            <input
              autoComplete="email"
              className="h-11 rounded-control border border-line bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-focus"
              id="email"
              name="email"
              required
              type="email"
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm text-muted" htmlFor="message">
          Message
          <textarea
            className="min-h-36 resize-y rounded-control border border-line bg-surface px-3 py-2.5 text-sm leading-6 text-text outline-none transition-colors focus:border-focus"
            id="message"
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
            {status === "error" && !import.meta.env.VITE_WEB3FORMS_ACCESS_KEY
              ? "Contact form is not configured yet."
              : statusMessages[status]}
          </p>
          <button
            className="min-h-11 rounded-control bg-text px-4 text-sm font-semibold text-page transition-transform active:scale-[0.98] disabled:opacity-60"
            disabled={status === "submitting" || status === "success"}
            type="submit"
          >
            {buttonLabels[status]}
          </button>
        </div>
      </form>
    </main>
  );
};

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact | Akshar Patel" },
      { content: "Get in touch with Akshar Patel.", name: "description" },
    ],
  }),
});
