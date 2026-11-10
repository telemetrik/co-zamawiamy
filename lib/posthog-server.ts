import { PostHog } from "posthog-node";

let posthogServer: PostHog | undefined;

export function getPostHogServer() {
  const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!posthogProjectToken || !posthogHost) {
    return undefined;
  }

  posthogServer ??= new PostHog(posthogProjectToken, {
    host: posthogHost,
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: 2_000,
    fetchRetryCount: 0,
    enableExceptionAutocapture: process.env.NEXT_RUNTIME === "nodejs",
  });

  return posthogServer;
}
