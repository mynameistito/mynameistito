import { createFileRoute } from "@tanstack/react-router";

const redirects = new Map<string, string>([
  ["cubic", "https://www.cubic.dev/invite/mynameistito"],
  ["greptile", "https://app.greptile.com/signup?ref=NjEyNzMtNDI3MzM="],
  ["v0", "https://v0.app/ref/0U7LO6"],
  [
    "opencode.json",
    "https://gist.github.com/mynameistito/ea327477bad320ffa412af8213f9a0a6",
  ],
  [
    "opencode.jsonc",
    "https://gist.github.com/mynameistito/ea327477bad320ffa412af8213f9a0a6",
  ],
  ["warp", "https://app.warp.dev/referral/3PGX4L"],
  ["wisprflow", "https://wisprflow.ai/r/MY71"],
]);
const redirectRef = ({ params }: { params: { ref: string } }) => {
  const destination = redirects.get(params.ref);
  return destination
    ? new Response(null, { headers: { Location: destination }, status: 302 })
    : new Response("Not Found", { status: 404 });
};

export const Route = createFileRoute("/r/$ref")({
  server: {
    handlers: {
      GET: redirectRef,
    },
  },
});
