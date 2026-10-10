import { createFileRoute } from "@tanstack/react-router";

const robots = `User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://mynameistito.com/sitemap.xml
`;
const getRobots = () =>
  new Response(robots, { headers: { "Content-Type": "text/plain" } });

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: getRobots,
    },
  },
});
