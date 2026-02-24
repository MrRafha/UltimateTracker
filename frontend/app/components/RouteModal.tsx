"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { ZoneData } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────
type AvalonZone = { index: string; uniqueName: string };

/** A suggestion can be a real-world zone (has map coords) or an instanced Avalon zone */
type ZoneSuggestion =
  | { type: "world"; label: string; zoneId: string }
  | { type: "avalon"; label: string; index: string };

interface WaypointForm {
  zoneName: string;
  hours: number;
  minutes: number;
  query: string;
  suggestions: ZoneSuggestion[];
  focused: boolean;
}

// ── Excluded world zones (no Avalon spawns there) ─────────────────────────
const EXCLUDED_MULTI: string[][] = [
  ["thetford",      "portal"],
  ["bridgewatch",   "portal"],
  ["martlock",      "portal"],
  ["fort sterling", "portal"],
  ["lymhurst",      "portal"],
];
const EXCLUDED_SINGLE = [
  "morgana's rest", "arthur's rest", "merlyn's rest", "merlin's rest",
  "morgana rest",   "arthur rest",   "merlyn rest",
];

function isExcludedWorldZone(displayName: string): boolean {
  const dn = displayName.toLowerCase();
  if (EXCLUDED_SINGLE.some((m) => dn.includes(m))) return true;
  if (EXCLUDED_MULTI.some((kws) => kws.every((kw) => dn.includes(kw)))) return true;
  return false;
}

function searchZones(
  q: string,
  worldZones: ZoneData[],
  avalonZones: AvalonZone[],
): ZoneSuggestion[] {
  if (q.length < 1) return [];
  const ql = q.toLowerCase();
  const LIMIT = 5;

  const world: ZoneSuggestion[] = worldZones
    .filter((z) => !isExcludedWorldZone(z.displayName) && z.displayName.toLowerCase().includes(ql))
    .slice(0, LIMIT)
    .map((z) => ({ type: "world" as const, label: z.displayName, zoneId: z.zoneId }));

  const avalon: ZoneSuggestion[] = avalonZones
    .filter((z) => z.uniqueName.toLowerCase().includes(ql) || z.index.toLowerCase().includes(ql))
    .slice(0, LIMIT)
    .map((z) => ({ type: "avalon" as const, label: z.uniqueName, index: z.index }));

  return [...world, ...avalon].slice(0, 8);
}

function makeWaypoint(): WaypointForm {
  return { zoneName: "", hours: 0, minutes: 0, query: "", suggestions: [], focused: false };
}

function MIcon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  return (
    <span
      className="material-icons"
      style={{ fontSize: size, color: color ?? "inherit", lineHeight: 1, userSelect: "none" }}
    >
      {name}
    </span>
  );
}

// ── Autocomplete Input ─────────────────────────────────────────────────────
function ZoneAutocomplete({
  value,
  query,
  suggestions,
  focused,
  placeholder,
  worldZones,
  avalonZones,
  onChange,
  onPick,
  onFocus,
  onBlur,
}: {
  value: string;
  query: string;
  suggestions: ZoneSuggestion[];
  focused: boolean;
  placeholder: string;
  worldZones: ZoneData[];
  avalonZones: AvalonZone[];
  onChange: (query: string, suggestions: ZoneSuggestion[]) => void;
  onPick: (s: ZoneSuggestion) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    onChange(q, searchZones(q, worldZones, avalonZones));
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        autoComplete="off"
        placeholder={placeholder}
        value={value !== "" ? value : query}
        onChange={handleInput}
        onFocus={onFocus}
        onBlur={() => setTimeout(onBlur, 180)}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.07)",
          border: `1px solid ${focused ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 6,
          color: "#eee",
          fontSize: 13,
          padding: "7px 10px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {focused && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            zIndex: 9999,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#1a1a20",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 6,
            maxHeight: 220,
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
          }}
        >
          {suggestions.map((s, i) => {
            const isWorld = s.type === "world";
            return (
              <button
                key={i}
                onMouseDown={() => onPick(s)}
                style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#ddd", fontSize: 13, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: 10, fontWeight: 700, color: isWorld ? "#88cc88" : "#6688aa", background: isWorld ? "rgba(100,160,100,0.18)" : "rgba(100,136,170,0.15)", borderRadius: 4, padding: "1px 5px", flexShrink: 0, fontFamily: "monospace", letterSpacing: 0.3 }}>
                  {isWorld ? "🌍" : s.index}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Route Preview ───────────────────────────────────────────────────────────
function RoutePreview({ waypoints }: { waypoints: WaypointForm[] }) {
  const t = useTranslations();
  const filled = waypoints.filter((w) => w.zoneName);
  if (filled.length === 0) return null;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 8,
        padding: "10px 12px",
        marginBottom: 16,
        overflowX: "auto",
        whiteSpace: "nowrap",
        scrollbarWidth: "thin",
      }}
    >
      <div style={{ fontSize: 10, color: "#555", marginBottom: 6, textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5 }}>
        {t('modal.route_preview')}
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
        {waypoints.map((wp, i) => {
          const isFirst = i === 0;
          const hasTime = !isFirst && (wp.hours > 0 || wp.minutes > 0);
          return (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
              {i > 0 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0 6px", color: "#555" }}>
                  <span style={{ fontSize: 11, color: "#444" }}>─</span>
                  {hasTime && (
                    <span style={{ fontSize: 11, color: "#88aa66", fontWeight: 700 }}>
                      {wp.hours > 0 ? `${wp.hours}h` : ""}{wp.minutes > 0 ? `${wp.minutes}m` : ""}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "#444" }}>→</span>
                </div>
              )}
              <div
                style={{
                  background: isFirst ? "rgba(100,160,100,0.15)" : "rgba(100,130,200,0.12)",
                  border: `1px solid ${isFirst ? "rgba(100,160,100,0.3)" : "rgba(100,130,200,0.25)"}`,
                  borderRadius: 5,
                  padding: "3px 8px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isFirst ? "#88cc88" : "#88aadd",
                  maxWidth: 140,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "inline-block",
                }}
                title={wp.zoneName}
              >
                {wp.zoneName || "?"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Modal ──────────────────────────────────────────────────────────────
export default function RouteModal({
  guildId,
  zones,
  onClose,
  onSuccess,
}: {
  guildId: string;
  zones: ZoneData[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations();
  const [avalonZones, setAvalonZones] = useState<AvalonZone[]>([]);
  const [waypoints, setWaypoints] = useState<WaypointForm[]>([makeWaypoint(), makeWaypoint()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/avalon-zones`)
      .then((r) => r.json())
      .then(setAvalonZones)
      .catch(() => {});
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const updateWaypoint = useCallback(
    (i: number, patch: Partial<WaypointForm>) => {
      setWaypoints((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
    },
    []
  );

  function addWaypoint() {
    setWaypoints((prev) => [...prev, makeWaypoint()]);
  }

  function removeWaypoint(i: number) {
    if (waypoints.length <= 2) return;
    setWaypoints((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (waypoints.some((w) => !w.zoneName)) {
      setError(t('modal.route_error_fill_zones'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/routes`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guild_id: guildId,
          reported_by_name: "",
          source: "web",
          waypoints: waypoints.map((w) => ({
            zone_name: w.zoneName,
            hours: w.hours,
            minutes: w.minutes,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.detail ?? `Erro ${res.status}`);
        return;
      }
      onSuccess();
    } catch {
      setError(t('modal.route_error_connection'));
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = !submitting && waypoints.every((w) => w.zoneName.trim() !== "");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#111116",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          width: "100%",
          maxWidth: 540,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <MIcon name="route" size={18} color="#88aadd" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#eee" }}>{t('modal.route_title')}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{t('modal.route_subtitle')}</div>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4, borderRadius: 4 }}
          >
            <MIcon name="close" size={18} color="#555" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {/* Legend */}
          <div style={{ display: "flex", gap: 10, marginBottom: 12, padding: "7px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#88cc88", background: "rgba(100,160,100,0.18)", borderRadius: 4, padding: "1px 5px", fontFamily: "monospace" }}>🌍</span>
                <span style={{ fontSize: 11, color: "#555" }}>{t('modal.route_zone_world')}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#6688aa", background: "rgba(100,136,170,0.15)", borderRadius: 4, padding: "1px 5px", fontFamily: "monospace" }}>TNL-xxx</span>
                <span style={{ fontSize: 11, color: "#555" }}>{t('modal.route_zone_avalon')}</span>
            </div>
          </div>

          {/* Preview */}
          <RoutePreview waypoints={waypoints} />

          {/* Waypoints */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, marginBottom: 10 }}>
              {t('modal.route_waypoints_min')}
            </div>

            {waypoints.map((wp, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 8,
                  padding: "12px",
                  marginBottom: 8,
                  position: "relative",
                }}
              >
                {/* Step label + remove */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: i === 0 ? "#88cc88" : "#88aadd",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {i === 0 ? t('modal.route_step_entry') : t('modal.route_step_n', { n: i + 1 })}
                  </span>
                  {waypoints.length > 2 && (
                    <button
                      onClick={() => removeWaypoint(i)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", borderRadius: 4 }}
                    >
                      <MIcon name="remove_circle_outline" size={15} color="#555" />
                    </button>
                  )}
                </div>

                {/* Zone autocomplete */}
                <ZoneAutocomplete
                  value={wp.zoneName}
                  query={wp.query}
                  suggestions={wp.suggestions}
                  focused={wp.focused}
                  placeholder={i === 0 ? t('modal.route_entry_placeholder') : t('modal.route_next_placeholder')}
                  worldZones={zones}
                  avalonZones={avalonZones}
                  onChange={(query, suggestions) => updateWaypoint(i, { query, suggestions, zoneName: "" })}
                  onPick={(s) => updateWaypoint(i, { zoneName: s.label, query: s.label, suggestions: [], focused: false })}
                  onFocus={() => updateWaypoint(i, { focused: true })}
                  onBlur={() => updateWaypoint(i, { focused: false })}
                />

                {/* Timer — not shown for first waypoint */}
                {i > 0 && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <MIcon name="timer" size={14} color="#555" />
                    <span style={{ fontSize: 11, color: "#555" }}>{t('modal.route_time_label')}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={wp.hours}
                        onChange={(e) => updateWaypoint(i, { hours: Number(e.target.value) })}
                        style={{
                          width: 52,
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 5,
                          color: "#eee",
                          fontSize: 13,
                          padding: "4px 7px",
                          outline: "none",
                          textAlign: "center",
                        }}
                      />
                      <span style={{ color: "#555", fontSize: 12 }}>h</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={wp.minutes}
                        onChange={(e) => updateWaypoint(i, { minutes: Number(e.target.value) })}
                        style={{
                          width: 52,
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 5,
                          color: "#eee",
                          fontSize: 13,
                          padding: "4px 7px",
                          outline: "none",
                          textAlign: "center",
                        }}
                      />
                      <span style={{ color: "#555", fontSize: 12 }}>m</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add waypoint button */}
          <button
            onClick={addWaypoint}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.04)",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#555",
              fontSize: 13,
              padding: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <MIcon name="add" size={15} color="#555" />
            {t('modal.add_waypoint')}
          </button>

          {error && (
            <div
              style={{
                background: "rgba(255,60,60,0.12)",
                border: "1px solid rgba(255,60,60,0.25)",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12,
                color: "#ff8888",
                marginTop: 4,
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            gap: 8,
            flexShrink: 0,
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 7,
              color: "#888",
              fontSize: 13,
              padding: "9px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              flex: 2,
              background: canSubmit ? "rgba(100,136,170,0.25)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${canSubmit ? "rgba(100,136,170,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 7,
              color: canSubmit ? "#88aadd" : "#444",
              fontSize: 13,
              fontWeight: 700,
              padding: "9px",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? t('modal.submitting') : t('modal.submit_route')}
          </button>
        </div>
      </div>
    </div>
  );
}
