import { Link } from "@tanstack/react-router";

/**
 * Renders the site's 404 page for unmatched routes and resources.
 * @returns The rendered 404 page.
 */
export const NotFoundPage = () => (
  <main className="page-shell grid min-h-screen content-center gap-3">
    <p className="m-0 text-xs font-medium uppercase tracking-wider text-muted">
      404
    </p>
    <h1 className="m-0 text-2xl font-semibold tracking-tight text-text">
      Page not found
    </h1>
    <p className="m-0 text-sm leading-copy text-muted">
      The page you’re looking for doesn’t exist or may have moved.
    </p>
    <form
      action="https://www.google.com/search"
      className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
      method="get"
    >
      <label className="sr-only" htmlFor="not-found-search">
        Search this site
      </label>
      <input
        className="h-11 rounded-control border border-line bg-surface px-3 text-sm text-text outline-none focus:border-focus"
        id="not-found-search"
        name="q"
        placeholder="Search this site"
        type="search"
      />
      <input name="sitesearch" type="hidden" value="mynameistito.com" />
      <button
        className="min-h-11 rounded-control bg-text px-4 text-sm font-semibold text-page"
        type="submit"
      >
        Search
      </button>
    </form>
    <Link
      className="mt-2 w-fit text-sm text-text underline decoration-subtle underline-offset-4"
      to="/"
    >
      Back to home
    </Link>
  </main>
);
