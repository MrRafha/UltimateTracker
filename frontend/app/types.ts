// ============================================================
// Shared types — used across pages and components
// ============================================================

export type ZoneCenter = { x: number; y: number };

export type ZoneData = {
  zoneId: string;
  displayName: string;
  center: ZoneCenter;
};

// ── Timers (scraped from unslave.online) ─────────────────────
export type TimerItem = {
  id: string;
  objective: string;
  zoneName: string;
  zoneKey: string;
  zoneId: string | null;
  center: ZoneCenter | null;
  spawnMs?: number;
  respawnAt?: string;
  status?: "COUNTDOWN" | "SPAWNED";
  source?: string;
};

// ── Guild Tracker (reported by bot or web form) ───────────────
export type TrackerType = "node" | "orb" | "vortex";

export type NodeObjective = "couro" | "linho" | "minério" | "madeira";
export type OrbObjective = "verde" | "azul" | "roxa" | "dourada";
export type VortexObjective = "verde" | "azul" | "roxo" | "dourado";
export type TrackerObjective = NodeObjective | OrbObjective | VortexObjective;

export type TrackerSource = "discord" | "web";

export type ServerRegion = "WEST" | "EAST" | "ASIA";
export type NodeTier = "T4.4" | "T5.4" | "T6.4" | "T7.4" | "T8.4";

export type GuildTracker = {
  id: string;
  guildId: string;
  zoneName: string;
  zoneId: string | null;
  center: ZoneCenter | null;
  type: TrackerType;
  objective: TrackerObjective;
  reportedById: string;
  reportedByName: string;
  source: TrackerSource;
  createdAt: string;
  expiresAt: string;
  tier?: NodeTier;
};

// ── Map ping (unified shape for WorldMap) ────────────────────
export type PingSource = "unslave" | "guild";

export type Ping = {
  id: string;
  zoneId: string;
  label: string;
  objective: string;
  center: ZoneCenter;
  source: PingSource;
  status?: "COUNTDOWN" | "SPAWNED";
  expiresAt?: string;
};

// ── Auth ─────────────────────────────────────────────────────
export type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  guildId: string | null;
  guildName: string | null;
  hasAccess: boolean;
  isAdmin?: boolean;
};

export type GuildAccess = {
  guild_id: string;
  guild_name: string;
  icon?: string | null;
  server_region?: ServerRegion;   // WEST / EAST / ASIA
};

// ── Constants shared between bot/web form ────────────────────
export const OBJECTIVES_BY_TYPE: Record<TrackerType, string[]> = {
  node: ["couro", "linho", "minério", "madeira"],
  orb: ["verde", "azul", "roxa", "dourada"],
  vortex: ["verde", "azul", "roxo", "dourado"],
};

export const TYPE_LABELS: Record<TrackerType, string> = {
  node: "Node",
  orb: "Orb",
  vortex: "Vortex",
};

// ── Avalonian Road Routes ─────────────────────────────────────
export type RouteWaypoint = {
  id: string;
  order: number;
  zoneName: string;
  zoneId: string | null;
  center: ZoneCenter | null;
  expiresAt: string | null;  // null = first waypoint (entry, already open)
};

export type Route = {
  id: string;
  guildId: string;
  reportedByName: string;
  source: TrackerSource;
  createdAt: string;
  waypoints: RouteWaypoint[];
};

// ── Avalon Portals ───────────────────────────────────────────
export type PortalSize = 0 | 2 | 7 | 20;

export type AvalonPortal = {
  id: string;
  conn1: string;
  conn2: string;
  size: PortalSize;
  expiresAt: string | null;   // null = Royal (permanent)
  timeLeft: number;            // seconds; 999999 = Royal
  reportedByName: string;
  createdAt: string;
};

export const PORTAL_SIZE_COLOR: Record<PortalSize, string> = {
  0:  "#CC44FF",  // Royal
  2:  "#44dd88",  // 2-man
  7:  "#4499ff",  // 7-man
  20: "#FFB347",  // 20-man
};

export const PORTAL_SIZE_LABEL: Record<PortalSize, string> = {
  0:  "Royal",
  2:  "2-man",
  7:  "7-man",
  20: "20-man",
};

export const OBJECTIVE_EMOJI: Record<string, string> = {
  // nodes
  couro: "🐂",
  linho: "🌾",
  minério: "⛏️",
  madeira: "🌲",
  // orbs & vortex — same names, share color emojis
  verde: "🟢",
  azul: "🔵",
  roxa: "🟣",
  dourada: "🟡",
  roxo: "🟣",
  dourado: "🟡",
};
