import { createFileRoute } from "@tanstack/react-router";

const publicPaths = [
  "/",
  "/about",
  "/contact",
  "/links",
  "/open-source",
  "/projects",
];
const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const getSitemap = () => {
  const entries = publicPaths
    .map((path) => {
      const url = `https://mynameistito.com${path}`;
      return `  <url><loc>${escapeXml(url)}</loc></url>`;
    })
    .join("\n");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>`,
    { headers: { "Content-Type": "application/xml" } }
  );
};

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: getSitemap,
    },
  },
});
