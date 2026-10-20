import { Link, createFileRoute } from "@tanstack/react-router";

const PrivacyPage = () => (
  <main className="page-shell pt-page-top-header pb-page-bottom">
    <section className="mt-section grid max-w-prose gap-4">
      <h1 className="m-0 text-page-title leading-tight font-semibold tracking-title text-text">
        Privacy
      </h1>
      <p className="m-0 text-base leading-6 text-muted">
        This site uses Cloudflare Turnstile to verify site-wide visitor count
        requests, blog post view requests, and contact form submissions.
        Turnstile usually runs in the background and shows a challenge only when
        interaction is required. See the{" "}
        <a
          className="text-text underline"
          href="https://www.cloudflare.com/turnstile-privacy-policy/"
          rel="noreferrer"
          target="_blank"
        >
          Cloudflare Turnstile Privacy Addendum
        </a>{" "}
        for information about how Cloudflare processes data for this service.
      </p>
      <p className="m-0 text-base leading-6 text-muted">
        The site-wide visitor counter and blog post view counter use an
        HTTP-only cookie containing a random ID to distinguish returning visits
        and calculate counts. The cookie can remain in your browser for up to
        one year. Contact form submissions (name, email address, and message)
        are sent to my inbox through Resend.
      </p>
      <p className="m-0 text-base leading-6 text-muted">
        For privacy questions, use the <Link to="/contact">contact page</Link>.
      </p>
    </section>
  </main>
);

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy | Tito" },
      {
        content: "Privacy information for mynameistito.com.",
        name: "description",
      },
    ],
  }),
});
