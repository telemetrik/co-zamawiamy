"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { RetryPanel } from "@/components/retry-panel";
import { PollResultsDemoError } from "@/lib/demo-results-error";

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    posthog.captureException(error, error instanceof PollResultsDemoError ? {
      demo_scenario: "five-option-results",
      option_count: error.optionCount,
      screen: "poll_results",
      vote_saved: true,
    } : undefined);
  }, [error]);

  return <RetryPanel />;
}
