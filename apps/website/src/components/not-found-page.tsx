import { Link } from "@tanstack/react-router";

/**
 * Renders the site's 404 page for unmatched routes and resources.
 * @returns The rendered 404 page.
 */
export const NotFoundPage = () => (
  <main className="mx-auto grid min-h-screen w-[min(100%-48px,644px)] content-center gap-3">
    <p className="m-0 text-xs font-medium uppercase tracking-wider text-muted">
      404
    </p>
    <h1 className="m-0 text-2xl font-semibold tracking-tight text-text">
      Page not found
    </h1>
    <p className="m-0 text-sm leading-copy text-muted">
      The page you’re looking for doesn’t exist or may have moved.
    </p>
    <Link
      className="mt-2 w-fit text-sm text-text underline decoration-subtle underline-offset-4"
      to="/"
    >
      Back to home
    </Link>
  </main>
);
