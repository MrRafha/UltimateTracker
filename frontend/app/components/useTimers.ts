'use client';

import useSWR from 'swr';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export function useTimers(guildId?: string) {
  const url = guildId
    ? `${API_BASE}/timers?guild_id=${encodeURIComponent(guildId)}`
    : `${API_BASE}/timers`;
  return useSWR(url, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 0,
  });
}