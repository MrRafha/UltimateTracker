"use client";
import useSWR from "swr";
import type { AvalonPortal, PortalSize } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch avalon portals");
    return r.json();
  });

function normalizePortal(raw: Record<string, unknown>): AvalonPortal {
  return {
    id: raw.id as string,
    conn1: raw.conn1 as string,
    conn2: raw.conn2 as string,
    size: raw.size as PortalSize,
    charges: (raw.charges as number | null) ?? null,
    expiresAt: (raw.expires_at as string | null) ?? null,
    timeLeft: raw.time_left as number,
    reportedByName: raw.reported_by_name as string,
    createdAt: raw.created_at as string,
  };
}

export function useAvalonPortals(guildId: string) {
  const { data, error, mutate } = useSWR<AvalonPortal[]>(
    guildId ? `${API_BASE}/avalon-portals?guild_id=${guildId}` : null,
    (url: string) => fetcher(url).then((arr) => arr.map(normalizePortal)),
    { refreshInterval: 30_000 },
  );

  return { portals: data ?? [], error, mutate };
}
