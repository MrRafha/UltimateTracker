import useSWR from "swr";
import type { DiscordUser } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

function normalizeUser(raw: Record<string, unknown>): DiscordUser {
  return {
    id: raw.id as string,
    username: raw.username as string,
    discriminator: (raw.discriminator as string | undefined) ?? "0",
    avatar: raw.avatar as string | null,
    guildId: (raw.guild_id as string | undefined) ?? null,
    guildName: (raw.guild_name as string | undefined) ?? null,
    hasAccess: (raw.has_access as boolean | undefined) ?? true,
    isAdmin: (raw.is_admin as boolean | undefined) ?? false,
  };
}

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (r.status === 401) return null;
    if (!r.ok) throw new Error("Failed to fetch user");
    return r.json().then((raw) => raw ? normalizeUser(raw as Record<string, unknown>) : null);
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
