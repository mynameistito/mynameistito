import { createFileRoute } from "@tanstack/react-router";

const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>My Name is Tito</title>
  <subtitle>Building cool things on the internet</subtitle>
  <link href="https://mynameistito.com/feed.xml" rel="self" />
  <link href="https://mynameistito.com/" />
  <id>https://mynameistito.com/</id>
  <author><name>Tito</name></author>
</feed>`;
const getFeed = () =>
  new Response(feed, {
    headers: {
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
      "Content-Type": "application/atom+xml",
    },
  });

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: getFeed,
    },
  },
});
