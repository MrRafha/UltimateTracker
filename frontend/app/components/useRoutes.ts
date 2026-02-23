"use client";
import useSWR from "swr";
import type { Route } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch routes");
    return r.json();
  });

// Converts snake_case API response to camelCase Route type
function normalizeRoute(raw: Record<string, unknown>): Route {
  return {
    id: raw.id as string,
    guildId: raw.guild_id as string,
    reportedByName: raw.reported_by_name as string,
    source: raw.source as Route["source"],
    createdAt: raw.created_at as string,
    waypoints: ((raw.waypoints ?? []) as Record<string, unknown>[]).map((wp) => ({
      id: wp.id as string,
      order: wp.order as number,
      zoneName: wp.zone_name as string,
      zoneId: (wp.zone_id as string | null) ?? null,
      center: wp.center
        ? { x: (wp.center as Record<string, number>).x, y: (wp.center as Record<string, number>).y }
        : null,
      expiresAt: (wp.expires_at as string | null) ?? null,
    })),
  };
}

export function useRoutes(guildId: string) {
  const { data, error, mutate } = useSWR<Route[]>(
    `${API_BASE}/routes?guild_id=${guildId}`,
    (url: string) => fetcher(url).then((arr) => arr.map(normalizeRoute)),
    { refreshInterval: 30_000 },
  );

  return { routes: data ?? [], error, mutate };
}
