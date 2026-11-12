"use client";

import { useEffect, useState } from "react";
import type { CityReach } from "@/lib/types";

type CityCloudState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; cities: CityReach[] };

export function CityCloud() {
  const [state, setState] = useState<CityCloudState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadCities() {
      try {
        const response = await fetch("/api/city-reach", { signal: controller.signal });
        if (!response.ok) throw new Error("City reach unavailable");
        const { cities }: { cities: CityReach[] } = await response.json();
        if (!controller.signal.aborted) setState({ status: "ready", cities });
      } catch {
        if (!controller.signal.aborted) setState({ status: "unavailable" });
      }
    }

    void loadCities();
    return () => controller.abort();
  }, []);

  const cities = state.status === "ready" ? state.cities : [];
  const maxSessions = Math.max(1, ...cities.map(({ sessions }) => sessions));

  return (
    <section className="city-reach" aria-labelledby="city-reach-title">
      <div className="city-reach-header">
        <h2 id="city-reach-title">Skąd otwieracie ankiety?</h2>
        <span>Ostatnie 30 dni</span>
      </div>
      {cities.length > 0 ? (
        <ul className="city-cloud" role="list">
          {cities.map(({ city, countryCode, sessions }) => {
            const weight = Math.log(sessions) / Math.log(Math.max(2, maxSessions));
            const label = `${countryCode ? `${countryCode}, ` : ""}liczba sesji: ${sessions}`;
            return (
              <li
                key={`${city}-${countryCode ?? ""}`}
                data-prominent={weight >= 0.5}
                style={{ fontSize: `${0.875 + weight * 1.375}rem` }}
                title={label}
              >
                {city}<span className="sr-only">, {label}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="city-reach-status" role="status">
          {state.status === "loading" && <span className="city-reach-spinner" aria-hidden="true" />}
          {state.status === "loading"
            ? "Wczytuję miasta…"
            : state.status === "unavailable"
              ? "Miasta są chwilowo niedostępne."
              : "Brak danych o miastach."}
        </div>
      )}
    </section>
  );
}
