import useSWR from "swr";
import type { DiscordUser } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (r.status === 401) return null;
    if (!r.ok) throw new Error("Failed to fetch user");
    return r.json() as Promise<DiscordUser>;
  });

export function useMe() {
  const { data, error, isLoading } = useSWR<DiscordUser | null>(
    `${API_BASE}/auth/me`,
    fetcher,
    { revalidateOnFocus: false }
  );

  return {
    user: data ?? null,
    isLoading,
    isError: !!error,
    isAuthenticated: !!data,
  };
}
