import useSWR from "swr";
import type { GuildTracker } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// Converts snake_case API response to camelCase GuildTracker type
function normalizeTracker(raw: Record<string, unknown>): GuildTracker {
  return {
    id: raw.id as string,
    guildId: raw.guild_id as string,
    zoneName: raw.zone_name as string,
    zoneId: (raw.zone_id as string | null) ?? null,
    center: raw.center
      ? { x: (raw.center as Record<string, number>).x, y: (raw.center as Record<string, number>).y }
      : null,
    type: raw.type as GuildTracker["type"],
    objective: raw.objective as GuildTracker["objective"],
    reportedById: raw.reported_by_id as string,
    reportedByName: raw.reported_by_name as string,
    source: raw.source as GuildTracker["source"],
    createdAt: raw.created_at as string,
    expiresAt: raw.expires_at as string,
    tier: (raw.tier as GuildTracker["tier"]) ?? undefined,
  };
}

export function useTrackers(guildId: string) {
  const { data, error, isLoading, mutate } = useSWR<GuildTracker[]>(
    guildId ? `${API_BASE}/trackers?guild_id=${guildId}` : null,
    (url: string) =>
      fetch(url, { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch trackers");
        return r.json().then((arr: Record<string, unknown>[]) => arr.map(normalizeTracker));
      }),
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  return {
    trackers: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
