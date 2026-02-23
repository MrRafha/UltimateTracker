"use client";

import { useState, useRef, useEffect } from "react";
import type { ZoneData } from "../types";
import { OBJECTIVES_BY_TYPE, TYPE_LABELS, OBJECTIVE_EMOJI } from "../types";
import type { TrackerType } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

interface Props {
  guildId: string;
  zones: ZoneData[];
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

export default function ReportModal({ guildId, zones, onClose, onSuccess }: Props) {
  const [zoneName, setZoneName]   = useState("");
  const [zoneQuery, setZoneQuery] = useState("");
  const [hours, setHours]         = useState(0);
  const [minutes, setMinutes]     = useState(0);
  const [type, setType]           = useState<TrackerType | "">("");
  const [objective, setObjective] = useState("");
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
    ? zones.filter((z) => z.displayName.toLowerCase().includes(zoneQuery.toLowerCase())).slice(0, 7)
    : [];

  const objectives = type ? OBJECTIVES_BY_TYPE[type] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!zoneName || !type || !objective) { setError("Preencha todos os campos."); return; }
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
          reported_by_id: "web_user", reported_by_name: "Web", source: "web",
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
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!zoneName && !!type && !!objective && !loading;

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
              <div style={{ fontWeight: 800, fontSize: 15, color: "#eee" }}>Reportar Node</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>Scout da guilda</div>
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
            <label style={labelStyle}>Mapa / Zona</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <MIcon name="map" size={15} color="#555" />
              <input
                ref={inputRef}
                type="text"
                value={zoneName || zoneQuery}
                onChange={(e) => { setZoneQuery(e.target.value); setZoneName(""); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 160)}
                placeholder="Digite o nome do mapa..."
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
            <label style={labelStyle}>Tempo restante</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <input type="number" min={0} max={23} value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ ...inputStyle, textAlign: "center" }} />
                <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginTop: 4 }}>horas</div>
              </div>
              <span style={{ color: "#444", fontSize: 22, paddingBottom: 18, fontWeight: 200 }}>:</span>
              <div style={{ flex: 1 }}>
                <input type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ ...inputStyle, textAlign: "center" }} />
                <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginTop: 4 }}>minutos</div>
              </div>
            </div>
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Tipo</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {(["node", "orb", "vortex"] as TrackerType[]).map((t) => {
                const selected = type === t;
                const icons: Record<TrackerType, string> = { node: "forest", orb: "radio_button_checked", vortex: "cyclone" };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setObjective(""); }}
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
              <label style={labelStyle}>Objetivo</label>
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
                      {obj.charAt(0).toUpperCase() + obj.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
            {loading ? "Registrando..." : "Registrar"}
          </button>
        </form>
      </div>
    </div>
  );
}