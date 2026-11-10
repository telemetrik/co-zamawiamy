"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { RetryPanel } from "@/components/retry-panel";

export default function ErrorPage({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return <RetryPanel />;
}
