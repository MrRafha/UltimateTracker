"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Inter } from "next/font/google";
import useSWR from "swr";
import { useMe } from "../../components/useMe";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import { useMyGuilds } from "../../components/useMyGuilds";
import { useTrackers } from "../../components/useTrackers";
import { useTimers } from "../../components/useTimers";
import { useRoutes } from "../../components/useRoutes";
import { useAvalonPortals } from "../../components/useAvalonPortals";
import LayerToggle from "../../components/LayerToggle";
import type { GuildTracker, Ping, ZoneData, TimerItem, Route, AvalonPortal } from "../../types";

const WorldMap    = dynamic(() => import("../../components/WorldMap"),    { ssr: false });
const ReportModal = dynamic(() => import("../../components/ReportModal"), { ssr: false });
const RouteModal  = dynamic(() => import("../../components/RouteModal"),  { ssr: false });
const AvalonGraph = dynamic(() => import("../../components/AvalonGraph"), { ssr: false });
const PortalModal = dynamic(() => import("../../components/PortalModal"), { ssr: false });

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMs(ms: number): string {
  if (ms <= 0) return "SPAWN";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${p(m)}m ${p(s)}s` : `${p(m)}m ${p(s)}s`;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (isNaN(r)) return "255,255,255";
  return `${r},${g},${b}`;
}

function objStyleByStr(objective: string, type?: string): { icon: string; color: string } {
  const o = objective.toLowerCase();
  if (o === "couro")                              return { icon: "pets",                    color: "#DD7744" };
  if (o === "linho" || o.includes("fibra"))       return { icon: "grass",                   color: "#88DD44" };
  if (o.includes("min"))                          return { icon: "construction",             color: "#AAAAAA" };
  if (o === "madeira" || o.includes("madeira"))   return { icon: "forest",                  color: "#C8860A" };
  const vi = type === "vortex" ? "cyclone" : "radio_button_checked";
  if (o === "verde")                              return { icon: vi,                         color: "#44FF88" };
  if (o === "azul")                               return { icon: vi,                         color: "#44AAFF" };
  if (o === "roxa" || o === "roxo")               return { icon: vi,                         color: "#CC44FF" };
  if (o === "dourada" || o === "dourado")         return { icon: vi,                         color: "#FFD700" };
  if (o.includes("vort"))                         return { icon: "cyclone",                  color: "#CC44FF" };
  if (o.includes("orb"))                          return { icon: "radio_button_checked",     color: "#44AAFF" };
  if (o.includes("pedra") || o.includes("stone")) return { icon: "terrain",                 color: "#BBBBBB" };
  return { icon: "place", color: "#FFFFFF" };
}

function MIcon({ name, size = 18, color }: { name: string; size?: number; color?: string }) {
  return (
    <span className="material-icons" style={{ fontSize: size, color: color ?? "inherit", lineHeight: 1, userSelect: "none" }}>
      {name}
    </span>
  );
}

// ── Route card ────────────────────────────────────────────────────────────────

function routeBottleneck(route: Route, now: number): { ms: number; label: string } {
  const expirations = route.waypoints
    .filter((w) => w.expiresAt !== null)
    .map((w) => new Date(w.expiresAt!).getTime() - now);
  if (expirations.length === 0) return { ms: Infinity, label: "—" };
  const min = Math.min(...expirations);
  return { ms: min, label: fmtMs(min) };
}

function RouteDetailModal({ route, now, onClose, onDelete }: {
  route: Route; now: number; onClose: () => void; onDelete: () => void;
}) {
  const t = useTranslations();
  const entry = route.waypoints[0];
  const exit  = route.waypoints[route.waypoints.length - 1];
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 3000,
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 420,
          background: "#111116",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
          <MIcon name="filter_tilt_shift" size={18} color="#88aadd" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {entry.zoneName} → {exit.zoneName}
            </div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>por {route.reportedByName} · {route.waypoints.length} zonas</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", lineHeight: 1 }}>
            <MIcon name="close" size={18} color="#555" />
          </button>
        </div>

        {/* Waypoint list */}
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 2, maxHeight: "60vh", overflowY: "auto" }}>
          {route.waypoints.map((wp, i) => {
            const isFirst = i === 0;
            const isLast  = i === route.waypoints.length - 1;
            const msLeft  = wp.expiresAt ? new Date(wp.expiresAt).getTime() - now : null;
            const expired = msLeft !== null && msLeft <= 0;
            const urgent  = msLeft !== null && msLeft > 0 && msLeft < 10 * 60_000;
            const timeColor  = msLeft === null ? "#444" : expired ? "#555" : urgent ? "#FFD700" : "#66dd88";
            const roleColor  = isFirst ? "#44dd88" : isLast ? "#FF8C44" : "#88aadd";
            const roleLabel  = isFirst ? t('map.waypoint_entry') : isLast ? t('map.waypoint_exit') : t('map.waypoint_portal');
            return (
              <div key={wp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
                {/* Timeline dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 12 }}>
                  {i > 0 && <div style={{ width: 1, height: 6, background: "rgba(255,255,255,0.08)", marginBottom: 2 }} />}
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: roleColor, boxShadow: `0 0 6px ${roleColor}88`, flexShrink: 0 }} />
                  {i < route.waypoints.length - 1 && <div style={{ width: 1, height: 6, background: "rgba(255,255,255,0.08)", marginTop: 2 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wp.zoneName}</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>
                    <span style={{ color: roleColor, fontWeight: 700, marginRight: 4 }}>{roleLabel}</span>
                    {wp.expiresAt ? (expired ? t('map.timer_expired') : t('map.timer_expires_in')) : t('map.timer_no_timer')}
                  </div>
                </div>
                {msLeft !== null && (
                  <div style={{ fontSize: 13, fontWeight: 700, color: timeColor, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                    {fmtMs(msLeft)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onDelete}
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#f87171", fontSize: 12, fontWeight: 700, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <MIcon name="delete_outline" size={14} color="#f87171" />
            {t('map.route_delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Route Card (compact) ──────────────────────────────────────────────────────
function RouteCard({ route, now, onClick, onDelete }: {
  route: Route; now: number; onClick: () => void; onDelete: () => void;
}) {
  const { ms, label } = routeBottleneck(route, now);
  const urgent  = ms > 0 && ms < 10 * 60_000;
  const expired = ms <= 0;
  const timeColor = expired ? "#555" : urgent ? "#FFD700" : "#66dd88";

  const entry = route.waypoints[0]?.zoneName ?? "?";
  const exit  = route.waypoints[route.waypoints.length - 1]?.zoneName ?? "?";

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft: `3px solid ${expired ? "#444" : "#88aadd"}`,
        borderRadius: 8, padding: "9px 10px", marginBottom: 4,
        cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.055)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
    >
      <MIcon name="filter_tilt_shift" size={16} color={expired ? "#333" : "#88aadd"} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: expired ? "#444" : "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {entry} <span style={{ color: "#555" }}>→</span> {exit}
        </div>
        <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
          {route.waypoints.length} zonas · por {route.reportedByName}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: timeColor, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
        {label}
      </div>
    </button>
  );
}

// ── Unified item discriminated union ─────────────────────────────────────────

type UnifiedItem =
  | { kind: "guild"; data: GuildTracker }
  | { kind: "timer"; data: TimerItem };

// ── Single card for both item types ──────────────────────────────────────────

function UnifiedCard({ item, selected, now, onClick }: {
  item: UnifiedItem; selected: boolean; now: number; onClick: () => void;
}) {
  const isGuild = item.kind === "guild";
  const objective = isGuild ? item.data.objective : item.data.objective;
  const zoneName  = isGuild ? item.data.zoneName  : item.data.zoneName;
  const itemType  = isGuild ? item.data.type       : undefined;
  const { icon, color } = objStyleByStr(objective, itemType);

  const msLeft   = isGuild
    ? new Date(item.data.expiresAt).getTime() - now
    : (item.data.spawnMs ?? 0) - now;
  const expired  = msLeft <= 0;
  const urgent   = !expired && msLeft < 10 * 60_000;

  const timeColor = expired ? (isGuild ? "#555" : "#ff4444") : urgent ? "#FFD700" : "#66dd88";
  const borderLeftColor = expired ? (isGuild ? "#444" : "#ff444466") : color;
  const hasMapped = isGuild ? !!item.data.center : !!item.data.center;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        background: selected
          ? `linear-gradient(135deg,rgba(${hexToRgb(color)},0.15) 0%,rgba(255,255,255,0.03) 100%)`
          : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? `${color}55` : "rgba(255,255,255,0.07)"}`,
        borderLeft: `3px solid ${borderLeftColor}`,
        borderRadius: 8, padding: "9px 10px", cursor: "pointer",
        marginBottom: 4, display: "flex", alignItems: "center", gap: 10,
        opacity: hasMapped ? (expired && !isGuild ? 0.6 : 1) : 0.45,
      }}
    >
      {/* Icon bubble */}
      <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "rgba(0,0,0,0.45)", border: `1.5px solid ${expired ? "#444" : color}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: expired ? "none" : `0 0 6px ${color}44` }}>
        <MIcon name={icon} size={17} color={expired ? "#555" : color} />
      </div>

      {/* Labels */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: selected ? "#fff" : "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{objective}</div>
        <div style={{ fontSize: 11, color: "#666", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{zoneName}</span>
          {isGuild && item.data.tier && (() => {
            const TIER_COLORS: Record<string, string> = { "T4.4": "#888", "T5.4": "#22cc77", "T6.4": "#4499ff", "T7.4": "#aa44ff", "T8.4": "#FFD700" };
            const tc = TIER_COLORS[item.data.tier] ?? "#aaa";
            return (
              <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, color: tc, background: `${tc}1a`, border: `1px solid ${tc}44`, borderRadius: 4, padding: "1px 4px", letterSpacing: 0.3 }}>
                {item.data.tier}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Timer */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: timeColor }}>
          {isGuild ? fmtMs(msLeft) : (item.data.spawnMs ? fmtMs(msLeft) : "-")}
        </div>
        <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>
          {isGuild ? (item.data.source === "discord" ? "bot" : "web") : "server"}
        </div>
      </div>
    </button>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GuildMapPage({ params }: { params: Promise<{ guildId: string }> }) {
  const t = useTranslations();
  const { guildId }           = use(params);
  const router                = useRouter();
  const { user, isLoading }   = useMe();
  const { guilds, isLoading: guildsLoading } = useMyGuilds();

  // Redirect unauthenticated users to the login page
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?next=/map/${guildId}`);
    }
  }, [isLoading, user, router, guildId]);

  const { trackers, mutate }  = useTrackers(guildId);
  const { data: timersData }  = useTimers(guildId);
  const { routes, mutate: mutateRoutes } = useRoutes(guildId);
  const { portals, mutate: mutatePortals } = useAvalonPortals(guildId);

  // Admin bypass: when the user is an admin but not a regular guild member,
  // fetch guild data directly from the admin endpoint to allow map access.
  const _adminFetchKey = (user?.isAdmin && !guildsLoading && !guilds.some(g => g.guild_id === guildId))
    ? `${API_BASE}/admin/guilds/${guildId}`
    : null;
  const { data: adminGuildInfo } = useSWR<{
    guild_id: string; guild_name: string;
    server_region?: string;
  }>(
    _adminFetchKey,
    (url: string) => fetch(url, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    { revalidateOnFocus: false },
  );

  const [zones, setZones]                   = useState<ZoneData[]>([]);
  const [selectedPingId, setSelectedPingId] = useState<string | null>(null);
  const [showReport, setShowReport]         = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [showFabMenu, setShowFabMenu]       = useState(false);
  const [now, setNow]                       = useState(Date.now());
  const [search, setSearch]                 = useState("");
  const [timeFilter, setTimeFilter]         = useState<"all" | "10m" | "30m" | "1h">("all");
  const [tab, setTab]                       = useState<"nodes" | "routes" | "portals">("nodes");
  const [detailRouteId, setDetailRouteId]   = useState<string | null>(null);
  const [mapMode, setMapMode]               = useState<"world" | "avalon">("world");

  useEffect(() => {
    fetch(`${API_BASE}/zones`).then((r) => r.json()).then(setZones).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const timerItems: TimerItem[] = useMemo(
    () => (timersData?.items ?? []).filter((it: TimerItem) => it.zoneId && it.center),
    [timersData],
  );

  function matchesSearch(objective: string, zoneName: string) {
    if (!search) return true;
    const s = search.toLowerCase();
    return objective.toLowerCase().includes(s) || zoneName.toLowerCase().includes(s);
  }
  function timePassesForMs(ms: number) {
    if (timeFilter === "all") return true;
    if (timeFilter === "10m") return ms <= 10 * 60_000;
    if (timeFilter === "30m") return ms <= 30 * 60_000;
    if (timeFilter === "1h")  return ms <= 60 * 60_000;
    return true;
  }

  const filteredTrackers = useMemo(
    () => trackers.filter((tr) => matchesSearch(tr.objective, tr.zoneName) && timePassesForMs(new Date(tr.expiresAt).getTime() - now)),
    [trackers, search, timeFilter, now],
  );
  const filteredTimers = useMemo(
    () => timerItems.filter((it) => matchesSearch(it.objective, it.zoneName) && timePassesForMs((it.spawnMs ?? 0) - now)),
    [timerItems, search, timeFilter, now],
  );

  // Merged + sorted by countdown ascending
  const allItems: UnifiedItem[] = useMemo(() => {
    const g: UnifiedItem[] = filteredTrackers.map((data) => ({ kind: "guild" as const, data }));
    const timerUnified: UnifiedItem[] = filteredTimers.map((data)   => ({ kind: "timer" as const, data }));
    return [...g, ...timerUnified].sort((a, b) => {
      const msA = a.kind === "guild" ? new Date(a.data.expiresAt).getTime() - now : (a.data.spawnMs ?? 0) - now;
      const msB = b.kind === "guild" ? new Date(b.data.expiresAt).getTime() - now : (b.data.spawnMs ?? 0) - now;
      return msA - msB;
    });
  }, [filteredTrackers, filteredTimers, now]);

  const activeGuildCount = trackers.filter((tr) => new Date(tr.expiresAt).getTime() > now).length;
  const totalCount = allItems.length;

  const allPings: Ping[] = useMemo(() => {
    const guildPings: Ping[] = trackers.flatMap((tr) => {
      if (!tr.center) return [];
      return [{ id: tr.id, zoneId: tr.zoneId ?? tr.zoneName, label: `${tr.objective} - ${tr.zoneName}`, objective: tr.objective, center: tr.center!, source: "guild" as const, status: "COUNTDOWN" as const, expiresAt: tr.expiresAt }];
    });
    const unslavePings: Ping[] = timerItems.flatMap((it) => {
      if (!it.center) return [];
      return [{ id: it.id, zoneId: it.zoneId!, label: `${it.objective} - ${it.zoneName}`, objective: it.objective, center: it.center!, source: "unslave" as const, status: it.spawnMs && it.spawnMs <= now ? "SPAWNED" as const : "COUNTDOWN" as const }];
    });
    return [...guildPings, ...unslavePings];
  }, [trackers, timerItems, now]);

  const visibleIds    = useMemo(() => new Set(allItems.map((item) => item.kind === "guild" ? item.data.id : item.data.id)), [allItems]);
  const filteredPings = useMemo(() => allPings.filter((p) => visibleIds.has(p.id)), [allPings, visibleIds]);
  const selectedCenter = allPings.find((p) => p.id === selectedPingId)?.center ?? null;

  const TIME_FILTERS: { key: "all" | "10m" | "30m" | "1h"; label: string }[] = [
    { key: "all", label: t('map.filter_all') },
    { key: "10m", label: t('map.filter_10m') },
    { key: "30m", label: t('map.filter_30m') },
    { key: "1h",  label: t('map.filter_1h')  },
  ];

  if (isLoading || guildsLoading || !user) {
    return (
      <div className={inter.className} style={{ display: "flex", height: "100vh", background: "#0D0D0D", alignItems: "center", justifyContent: "center", color: "#8A8A8A" }}>
        {t('map.loading')}
      </div>
    );
  }

  const guildAccess = guilds.find((g) => g.guild_id === guildId);

  return (
    <div className={inter.className} style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0D0D0D" }}>

      {/* TOPBAR */}
      <div style={{
        height: 48, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 16px", gap: 12,
        background: "#0D0D0D",
        borderBottom: "1px solid #1F1F1F",
      }}>
        <img src="/brand/icon.png" alt="" height={22} style={{ display: "block", width: "auto" }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: "#eee", letterSpacing: 0.2 }}>UltimateTracker</span>
        {(guildAccess?.guild_name || user?.guildName) && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#8a93f5",
            background: "rgba(88,101,242,0.12)", border: "1px solid rgba(88,101,242,0.25)",
            borderRadius: 999, padding: "2px 10px",
          }}>
            {guildAccess?.guild_name ?? user?.guildName}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <Link
          href="/dashboard"
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#8A8A8A", textDecoration: "none" }}
        >
          <span className="material-icons" style={{ fontSize: 15, lineHeight: 1 }}>arrow_back</span>
          Dashboard
        </Link>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

      {/* SIDEBAR */}
      <aside style={{ width: 340, flexShrink: 0, borderRight: "1px solid #1F1F1F", background: "#111111", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "10px 14px 10px", borderBottom: "1px solid #1F1F1F", background: "#111111", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: "#555", display: "flex", gap: 10, marginBottom: 10 }}>
            <span style={{ color: "#66dd88" }}>{t('map.scouts_active', { count: activeGuildCount })}</span>
            <span>&bull;</span>
            <span style={{ color: "#aaa" }}>{t('map.mapped_count', { count: timerItems.length })}</span>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["nodes", "routes", "portals"] as const).map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                style={{
                  flex: 1,
                  padding: "5px 0",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  borderRadius: 5,
                  border: "none",
                  background: tab === tabKey ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                  color: tab === tabKey ? "#ddd" : "#555",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {tabKey === "nodes" ? t('map.tab_nodes') : tabKey === "routes" ? t('map.tab_routes') : t('map.tab_portals')}
              </button>
            ))}
          </div>
        </div>

        {/* Search + filters — only in nodes tab */}
        {tab === "nodes" && (
        <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, background: "rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.07)", borderRadius: 6, padding: "5px 8px", marginBottom: 6 }}>
            <MIcon name="search" size={14} color="#555" />
            <input
              type="text" value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('map.search_placeholder')}
              style={{ background: "none", border: "none", outline: "none", color: "#ddd", fontSize: 12, flex: 1, padding: 0 }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, display: "flex" }}>
                <MIcon name="close" size={13} color="#555" />
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {TIME_FILTERS.map(({ key, label }) => (
              <button key={key} onClick={() => setTimeFilter(key)} style={{ flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 700, cursor: "pointer", borderRadius: 5, border: "none", background: timeFilter === key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)", color: timeFilter === key ? "#eee" : "#666" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Unified list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 80px" }}>

          {tab === "nodes" ? (
            <>
              {/* List header label */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 2px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 0.5, textTransform: "uppercase" }}>{t('map.section_nodes')}</span>
                <span style={{ fontSize: 11, color: "#444", background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "1px 8px" }}>{totalCount}</span>
              </div>

              {allItems.length === 0 ? (
                <div style={{ fontSize: 12, color: "#444", padding: "16px 4px", textAlign: "center" }}>
                  {trackers.length === 0 && timerItems.length === 0
                    ? t('map.empty_nodes')
                    : t('map.empty_filter')}
                </div>
              ) : (
                allItems.map((item) => {
                  const id = item.kind === "guild" ? item.data.id : item.data.id;
                  return (
                    <UnifiedCard
                      key={`${item.kind}-${id}`}
                      item={item}
                      selected={selectedPingId === id}
                      now={now}
                      onClick={() => setSelectedPingId(selectedPingId === id ? null : id)}
                    />
                  );
                })
              )}
            </>
          ) : tab === "routes" ? (
            <>
              {/* Routes tab */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 2px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 0.5, textTransform: "uppercase" }}>{t('map.section_routes')}</span>
                <span style={{ fontSize: 11, color: "#444", background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "1px 8px" }}>{routes.length}</span>
              </div>

              {routes.length === 0 ? (
                <div style={{ fontSize: 12, color: "#444", padding: "16px 4px", textAlign: "center" }}>
                  {t('map.empty_routes')}
                </div>
              ) : (
                routes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    now={now}
                    onClick={() => setDetailRouteId(route.id)}
                    onDelete={async () => {
                      await fetch(`${API_BASE}/routes/${route.id}`, {
                        method: "DELETE",
                        credentials: "include",
                      });
                      mutateRoutes();
                    }}
                  />
                ))
              )}
            </>
          ) : (
            <>
              {/* Portals tab */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 2px" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 0.5, textTransform: "uppercase" }}>{t('map.section_portals')}</span>
                <span style={{ fontSize: 11, color: "#444", background: "rgba(255,255,255,0.06)", borderRadius: 999, padding: "1px 8px" }}>{portals.length}</span>
              </div>

              {portals.length === 0 ? (
                <div style={{ fontSize: 12, color: "#444", padding: "16px 4px", textAlign: "center" }}>
                  {t('map.empty_portals')}
                </div>
              ) : (
                portals.map((portal) => {
                  const expired = portal.timeLeft <= 0 && portal.size !== 0;
                  const urgent  = !expired && portal.size !== 0 && portal.timeLeft < 3600;
                  const PORTAL_COLOR: Record<number, string> = { 0: "#CC44FF", 2: "#44dd88", 7: "#4499ff", 20: "#FFB347" };
                  const color = expired ? "#444" : PORTAL_COLOR[portal.size] ?? "#888";
                  const timeLabel = portal.size === 0 ? "Royal" : expired ? t('map.timer_expired') : fmtMs(portal.timeLeft * 1000);
                  return (
                    <div
                      key={portal.id}
                      style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                        borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "9px 10px", marginBottom: 4,
                        display: "flex", alignItems: "center", gap: 8, opacity: expired ? 0.5 : 1,
                      }}
                    >
                      <MIcon name="hub" size={15} color={expired ? "#333" : "#CC44FF"} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: expired ? "#444" : "#ccc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {portal.conn1} <span style={{ color: "#555" }}>↔</span> {portal.conn2}
                        </div>
                        <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>
                          <span style={{ color, fontWeight: 700 }}>{portal.size === 0 ? "Royal" : `${portal.size}-man`}</span>
                          {portal.charges != null && <span style={{ color: "#888" }}> · {portal.charges}⚡</span>}
                          {" · "}por {portal.reportedByName}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: urgent ? "#FFD700" : expired ? "#555" : "#66dd88", fontVariantNumeric: "tabular-nums" }}>
                          {timeLabel}
                        </span>
                        <button
                          onClick={async () => {
                            await fetch(`${API_BASE}/avalon-portals/${portal.id}`, { method: "DELETE", credentials: "include" });
                            mutatePortals();
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", lineHeight: 1 }}
                          title={t('map.portal_delete')}
                        >
                          <MIcon name="delete_outline" size={14} color="#444" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* User footer */}
        {user && (
          <div style={{ padding: "8px 12px", borderTop: "1px solid #1F1F1F", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, background: "#111111" }}>
            {user.id && user.avatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`}
                alt=""
                width={24}
                height={24}
                style={{ borderRadius: "50%", flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                {user.username[0].toUpperCase()}
              </div>
            )}
            <span style={{ fontSize: 12, color: "#8A8A8A", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.username}</span>
            <LanguageSwitcher />
            <button
              onClick={async () => {
                await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
                window.location.href = "/login";
              }}
              style={{ fontSize: 11, color: "#8A8A8A", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
            >{t('common.logout')}</button>
          </div>
        )}
      </aside>

      {/* MAP / GRAPH */}
      <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Layer toggle */}
        <LayerToggle
          mode={mapMode}
          onChange={(m) => { setMapMode(m); if (m === "avalon") setTab("portals"); else if (tab === "portals") setTab("nodes"); }}
          worldLabel={t('map.layer_world')}
          avalonLabel={t('map.layer_avalon')}
        />

        {/* Main view */}
        {mapMode === "world" ? (
          <WorldMap
            pings={filteredPings}
            zones={zones}
            routes={routes}
            selectedPingId={selectedPingId ?? undefined}
            selectedCenter={selectedCenter ?? undefined}
            onSelectPing={setSelectedPingId}
            onRouteClick={setDetailRouteId}
          />
        ) : (
          <AvalonGraph
            portals={portals}
            routes={routes}
            emptyText={t('map.empty_portals')}
          />
        )}

        {/* FAB submenu — contextual by mode */}
        {showFabMenu && (
          <div
            style={{
              position: "absolute", bottom: 96, right: 28,
              display: "flex", flexDirection: "column", gap: 8,
              zIndex: 1001,
            }}
          >
            {(mapMode === "world"
              ? [
                  { label: t('map.report_node'),  icon: "sword_rose",        action: () => { setShowFabMenu(false); setShowReport(true); } },
                  { label: t('map.report_route'),  icon: "filter_tilt_shift", action: () => { setShowFabMenu(false); setShowRouteModal(true); } },
                ]
              : [
                  { label: t('map.report_portal'), icon: "hub",               action: () => { setShowFabMenu(false); setShowPortalModal(true); } },
                ]
            ).map(({ label, icon, action }) => (
              <button
                key={label}
                onClick={action}
                style={{
                  background: "#111116",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  color: "#ccc",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                }}
              >
                <MIcon name={icon} size={16} color={icon === "hub" ? "#CC44FF" : "#88aadd"} />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* FAB — dark */}
        <button
          onClick={() => setShowFabMenu((v) => !v)}
          title="Reportar"
          style={{
            position: "absolute", bottom: 28, right: 28,
            width: 56, height: 56, borderRadius: "50%",
            background: "#0d0d0d",
            border: `1px solid ${showFabMenu ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.18)"}`,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 24px rgba(0,0,0,0.7)",
            zIndex: 1000,
            transform: showFabMenu ? "rotate(45deg)" : "none",
            transition: "transform 0.2s ease",
          }}
        >
          <MIcon name="add" size={28} color="#ccc" />
        </button>

        {/* Backdrop to close fab menu */}
        {showFabMenu && (
          <div
            onClick={() => setShowFabMenu(false)}
            style={{ position: "absolute", inset: 0, zIndex: 999 }}
          />
        )}
      </main>

      </div>{/* end MAIN CONTENT wrapper */}

      {showReport && (
        <ReportModal
          guildId={guildId}
          zones={zones}
          user={user}
          onClose={() => setShowReport(false)}
          onSuccess={() => { setShowReport(false); mutate(); }}
        />
      )}

      {detailRouteId && (() => {
        const r = routes.find((x) => x.id === detailRouteId);
        if (!r) return null;
        return (
          <RouteDetailModal
            route={r}
            now={now}
            onClose={() => setDetailRouteId(null)}
            onDelete={async () => {
              await fetch(`${API_BASE}/routes/${r.id}`, { method: "DELETE", credentials: "include" });
              mutateRoutes();
              setDetailRouteId(null);
            }}
          />
        );
      })()}

      {showRouteModal && (
        <RouteModal
          guildId={guildId}
          zones={zones}
          onClose={() => setShowRouteModal(false)}
          onSuccess={() => { setShowRouteModal(false); mutateRoutes(); setTab("routes"); }}
        />
      )}

      {showPortalModal && (
        <PortalModal
          guildId={guildId}
          zones={zones}
          onClose={() => setShowPortalModal(false)}
          onSuccess={() => { setShowPortalModal(false); mutatePortals(); setTab("portals"); }}
        />
      )}
    </div>
  );
}