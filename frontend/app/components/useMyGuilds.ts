"use client";
import useSWR from "swr";
import type { GuildAccess } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (r.status === 401) return null;
    if (!r.ok) throw new Error("Failed to fetch guilds");
    return r.json() as Promise<GuildAccess[]>;
  });

export function useMyGuilds() {
  const { data, error, isLoading, mutate } = useSWR<GuildAccess[] | null>(
    `${API_BASE}/auth/guilds`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    guilds: data ?? [],
    isLoading,
    isError: !!error,
    isAuthenticated: data !== null && data !== undefined,
    mutate,
  };
}
