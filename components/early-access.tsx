"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { Icon } from "./icons";

const posthogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export function EarlyAccess() {
  useEffect(() => {
    if (!posthogConfigured) return;

    const root = document.documentElement;
    const unsubscribe = posthog.onFeatureFlags((_flags, variants) => {
      if (variants["tryb-ciemny"] === true) root.dataset.theme = "dark";
      else delete root.dataset.theme;

      if (variants["comic-sans"] === true) root.dataset.font = "comic-sans";
      else delete root.dataset.font;
    });

    return () => {
      unsubscribe();
      delete root.dataset.theme;
      delete root.dataset.font;
    };
  }, []);

  if (!posthogConfigured) return null;

  return (
    <button type="button" id="early-access-features" className="early-access-button" aria-haspopup="dialog">
      <Icon name="elixir" width="16" height="16" />
      <span>Funkcje beta</span>
    </button>
  );
}
