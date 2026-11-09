"use client";

import { useCallback, useEffect, useState } from "react";
import type { Poll } from "./types";

export function useLivePoll(initialPoll: Poll, enabled: boolean) {
  const [poll, setPoll] = useState(initialPoll);
  const [connection, setConnection] = useState<"connecting" | "live" | "reconnecting" | "paused">("connecting");
  const updatePoll = useCallback((next: Poll) => {
    // Głosy tylko przybywają. Spóźniony odczyt nie może cofnąć wyniku zapisu.
    setPoll((current) => next.id === current.id && next.totalVotes >= current.totalVotes ? next : current);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active: AbortController | undefined;

    async function refresh() {
      clearTimeout(timer);
      if (stopped || active) return;
      if (document.hidden || !navigator.onLine) {
        setConnection(navigator.onLine ? "paused" : "reconnecting");
        return;
      }
      const controller = new AbortController();
      active = controller;
      try {
        const response = await fetch(`/api/polls/${initialPoll.id}`, {
          cache: "no-store",
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
        });
        if (!response.ok) throw new Error("POLL_REFRESH_FAILED");
        const data: { poll: Poll } = await response.json();
        if (stopped || controller.signal.aborted) return;
        updatePoll(data.poll);
        setConnection("live");
      } catch {
        if (!stopped && !controller.signal.aborted) setConnection("reconnecting");
      } finally {
        if (active === controller) {
          active = undefined;
          if (!stopped && !document.hidden && navigator.onLine) timer = setTimeout(refresh, 2_000);
        }
      }
    }

    function resumeOrPause() {
      if (document.hidden || !navigator.onLine) {
        clearTimeout(timer);
        active?.abort();
        active = undefined;
        setConnection(navigator.onLine ? "paused" : "reconnecting");
      } else { void refresh(); }
    }

    void refresh();
    document.addEventListener("visibilitychange", resumeOrPause);
    window.addEventListener("online", resumeOrPause);
    window.addEventListener("offline", resumeOrPause);
    return () => {
      stopped = true;
      clearTimeout(timer);
      active?.abort();
      document.removeEventListener("visibilitychange", resumeOrPause);
      window.removeEventListener("online", resumeOrPause);
      window.removeEventListener("offline", resumeOrPause);
    };
  }, [enabled, initialPoll.id, updatePoll]);

  return { poll, updatePoll, connection };
}
