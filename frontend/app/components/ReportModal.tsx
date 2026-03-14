"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { ZoneData, DiscordUser } from "../types";
import { OBJECTIVES_BY_TYPE, TYPE_LABELS, OBJECTIVE_EMOJI } from "../types";
import type { TrackerType, NodeTier } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

interface Props {
  guildId: string;
  zones: ZoneData[];
  user: DiscordUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

function MIcon({ name, size = 18, color }: { name: string; size?: number; color?: string }) {
  return (
    <span className="material-icons" style={{ fontSize: size, color: color ?? "inherit", lineHeight: 1, userSelect: "none" }}>
      {name}
    </span>
  );
}

// ── Excluded world zones (no nodes/orbs/vortex spawn there) ──────────────
const EXCLUDED_EXACT = [
  "caerleon", "bridgewatch", "lymhurst", "martlock", "thetford", "fort sterling",
];
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
  if (EXCLUDED_EXACT.includes(dn)) return true;
  if (EXCLUDED_SINGLE.some((m) => dn.includes(m))) return true;
  if (EXCLUDED_MULTI.some((kws) => kws.every((kw) => dn.includes(kw)))) return true;
  return false;
}

export default function ReportModal({ guildId, zones, user, onClose, onSuccess }: Props) {
  const t = useTranslations();
  const [zoneName, setZoneName]   = useState("");
  const [zoneQuery, setZoneQuery] = useState("");
  const [hours, setHours]         = useState(0);
  const [minutes, setMinutes]     = useState(0);
  const [type, setType]           = useState<TrackerType | "">("");
  const [objective, setObjective] = useState("");
  const [tier, setTier]           = useState<NodeTier | "">("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const suggestions = zoneQuery.length > 1
    ? zones.filter((z) => !isExcludedWorldZone(z.displayName) && z.displayName.toLowerCase().includes(zoneQuery.toLowerCase())).slice(0, 7)
    : [];

  const objectives = type ? OBJECTIVES_BY_TYPE[type] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!zoneName || !type || !objective) { setError(t('modal.fill_all')); return; }
    if (type === "node" && !tier) { setError(t('modal.tier_required')); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/trackers`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guild_id: guildId, zone_name: zoneName, type, objective,
          hours, minutes,
          reported_by_id: user?.id ?? "web_user",
          reported_by_name: user?.username ?? "Web",
          source: "web",
          ...(type === "node" && tier ? { tier } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const detail = data?.detail;
        const msg = Array.isArray(detail)
          ? detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join("; ")
          : typeof detail === "string" ? detail : `Erro ${res.status}`;
        throw new Error(msg);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error_unknown'));
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!zoneName && !!type && !!objective && !(type === "node" && !tier) && !loading;

  // ── Shared input style ────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "10px 14px",
    color: "#eee", fontSize: 13, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 600,
    color: "rgba(255,255,255,0.45)", marginBottom: 6, letterSpacing: 0.4,
    textTransform: "uppercase",
  };

  return (
    // Backdrop
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Dialog */}
      <div style={{
        width: "100%", maxWidth: 440,
        background: "#16181f",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
        overflow: "hidden",
        fontFamily: "system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MIcon name="radar" size={18} color="#aaa" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#eee" }}>{t('modal.report_title')}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{t('modal.report_subtitle')}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <MIcon name="close" size={16} color="#777" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Zone autocomplete */}
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>{t('modal.field_zone')}</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <MIcon name="map" size={15} color="#555" />
              <input
                ref={inputRef}
                type="text"
                value={zoneName || zoneQuery}
                onChange={(e) => { setZoneQuery(e.target.value); setZoneName(""); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 160)}
                placeholder={t('modal.zone_placeholder')}
                style={{ ...inputStyle, paddingLeft: 34, marginLeft: -19 }}
                required
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <ul style={{ position: "absolute", zIndex: 10, top: "100%", marginTop: 4, width: "100%", background: "#0e1017", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", maxHeight: 200, overflowY: "auto", listStyle: "none", margin: 0, padding: 0 }}>
                {suggestions.map((z) => (
                  <li key={z.zoneId}>
                    <button
                      type="button"
                      onMouseDown={() => { setZoneName(z.displayName); setZoneQuery(z.displayName); setShowSuggestions(false); }}
                      style={{ width: "100%", textAlign: "left", padding: "9px 14px", background: "none", border: "none", color: "rgba(255,255,255,0.75)", fontSize: 13, cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      {z.displayName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Time */}
          <div>
            <label style={labelStyle}>{t('modal.field_time')}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <input type="number" min={0} max={23} value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ ...inputStyle, textAlign: "center" }} />
                <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginTop: 4 }}>{t('modal.hours')}</div>
              </div>
              <span style={{ color: "#444", fontSize: 22, paddingBottom: 18, fontWeight: 200 }}>:</span>
              <div style={{ flex: 1 }}>
                <input type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ ...inputStyle, textAlign: "center" }} />
                <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginTop: 4 }}>{t('modal.minutes')}</div>
              </div>
            </div>
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>{t('modal.field_type')}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {(["node", "orb", "vortex"] as TrackerType[]).map((t) => {
                const selected = type === t;
                const icons: Record<TrackerType, string> = { node: "forest", orb: "radio_button_checked", vortex: "cyclone" };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setObjective(""); setTier(""); }}
                    style={{
                      padding: "10px 0", borderRadius: 10, cursor: "pointer",
                      border: `1px solid ${selected ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                      background: selected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                      color: selected ? "#fff" : "#777",
                      fontWeight: 600, fontSize: 12,
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                      transition: "all 0.15s",
                    }}
                  >
                    <MIcon name={icons[t]} size={20} color={selected ? "#eee" : "#555"} />
                    {TYPE_LABELS[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Objective */}
          {type && (
            <div>
              <label style={labelStyle}>{t('modal.field_objective')}</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {objectives.map((obj) => {
                  const selected = objective === obj;
                  return (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => setObjective(obj)}
                      style={{
                        padding: "10px 0", borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${selected ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)"}`,
                        background: selected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                        color: selected ? "#fff" : "#777",
                        fontWeight: 600, fontSize: 13,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{OBJECTIVE_EMOJI[obj] ?? "📍"}</span>
                      {t(`objectives.${obj}`) ?? (obj.charAt(0).toUpperCase() + obj.slice(1))}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tier (nodes only) */}
          {type === "node" && objective && (() => {
            const TIER_COLORS: Record<string, string> = {
              "T4.4": "#888888",
              "T5.4": "#22cc77",
              "T6.4": "#4499ff",
              "T7.4": "#aa44ff",
              "T8.4": "#FFD700",
            };
            const TIERS = ["T4.4", "T5.4", "T6.4", "T7.4", "T8.4"] as const;
            return (
              <div>
                <label style={labelStyle}>{t("modal.field_tier")}</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                  {TIERS.map((tierOpt) => {
                    const selected = tier === tierOpt;
                    const color = TIER_COLORS[tierOpt];
                    return (
                      <button
                        key={tierOpt}
                        type="button"
                        onClick={() => setTier(tierOpt)}
                        style={{
                          padding: "8px 0", borderRadius: 10, cursor: "pointer",
                          border: `1px solid ${selected ? color : "rgba(255,255,255,0.1)"}`,
                          background: selected ? `${color}22` : "rgba(255,255,255,0.03)",
                          color: selected ? color : "#666",
                          fontWeight: 700, fontSize: 11,
                          transition: "all 0.15s",
                        }}
                      >
                        {tierOpt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Error */}
          {error && (
            <div style={{ background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#ff7070" }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "13px 0", borderRadius: 12, border: "none",
              background: canSubmit ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.08)",
              color: canSubmit ? "#111" : "#444",
              fontWeight: 700, fontSize: 14, cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            {loading ? t('modal.registering') : t('modal.register')}
          </button>
        </form>
      </div>
    </div>
  );
}