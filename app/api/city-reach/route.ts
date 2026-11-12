import type { CityReach } from "@/lib/types";

export async function GET() {
  const key = process.env.POSTHOG_CITY_REACH_API_KEY;
  const host = process.env.POSTHOG_HOST;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!key || !host || !projectId) {
    return new Response(null, { status: 503 });
  }

  try {
    const path = `/api/projects/${encodeURIComponent(projectId)}/endpoints/poll_reach_by_city/run`;
    const response = await fetch(new URL(path, host), {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ variables: { poll_id: "" } }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return new Response(null, { status: 502 });

    const data: { results?: unknown; error?: unknown } = await response.json();
    if (data.error || !Array.isArray(data.results)) {
      return new Response(null, { status: 502 });
    }

    const cities: CityReach[] = [];
    for (const row of data.results) {
      if (!Array.isArray(row)) return new Response(null, { status: 502 });
      const [city, countryCode, sessions] = row;
      if (typeof city !== "string" || !city.trim() ||
          (countryCode !== null && typeof countryCode !== "string") ||
          !Number.isSafeInteger(sessions) || sessions < 1) {
        return new Response(null, { status: 502 });
      }
      cities.push({ city, countryCode, sessions });
    }

    return Response.json({ cities }, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=900" },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
