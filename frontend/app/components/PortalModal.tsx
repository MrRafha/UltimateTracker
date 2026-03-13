"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ZoneData, PortalSize } from "../types";
import { PORTAL_SIZE_COLOR, PORTAL_SIZE_LABEL } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type AvalonZone = { index: string; uniqueName: string };
type ZoneSuggestion =
  | { type: "world"; label: string }
  | { type: "avalon"; label: string; index: string };

function searchZones(
  q: string,
  worldZones: ZoneData[],
  avalonZones: AvalonZone[],
): ZoneSuggestion[] {
  if (q.length < 1) return [];
  const ql = q.toLowerCase();
  const LIMIT = 6;
  const world: ZoneSuggestion[] = worldZones
    .filter((z) => z.displayName.toLowerCase().includes(ql))
    .slice(0, LIMIT)
    .map((z) => ({ type: "world" as const, label: z.displayName }));
  const avalon: ZoneSuggestion[] = avalonZones
    .filter((z) => z.index.toLowerCase().includes(ql) || z.uniqueName.toLowerCase().includes(ql))
    .slice(0, LIMIT)
    .map((z) => ({ type: "avalon" as const, label: z.uniqueName, index: z.index }));
  return [...world, ...avalon].slice(0, LIMIT);
}

function MIcon({ name, size = 16, color }: { name: string; size?: number; color?: string }) {
  return (
    <span className="material-icons" style={{ fontSize: size, color: color ?? "inherit", lineHeight: 1, userSelect: "none" }}>
      {name}
    </span>
  );
}

interface ZoneFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  worldZones: ZoneData[];
  avalonZones: AvalonZone[];
}

function ZoneField({ label, value, onChange, placeholder, worldZones, avalonZones }: ZoneFieldProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<ZoneSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestions(searchZones(query, worldZones, avalonZones));
  }, [query, worldZones, avalonZones]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function pick(s: ZoneSuggestion) {
    setQuery(s.label);
    onChange(s.label);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ position: "relative" }}>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "8px 10px", color: "#ddd", fontSize: 12,
            outline: "none",
          }}
        />
        {open && suggestions.length > 0 && (
          <div
            style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
              background: "#151518", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, marginTop: 2, overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onMouseDown={() => pick(s)}
                style={{
                  width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", background: "none", border: "none", cursor: "pointer",
                  color: "#ccc", fontSize: 12,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <MIcon name={s.type === "world" ? "place" : "hub"} size={13} color={s.type === "world" ? "#4499ff" : "#FFB347"} />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

interface PortalModalProps {
  guildId: string;
  zones: ZoneData[];
  onClose: () => void;
  onSuccess: () => void;
}

const SIZES: PortalSize[] = [7, 20, 0];

export default function PortalModal({ guildId, zones, onClose, onSuccess }: PortalModalProps) {
  const t = useTranslations();
  const [avalonZones, setAvalonZones] = useState<AvalonZone[]>([]);
  const [conn1, setConn1] = useState("");
  const [conn2, setConn2] = useState("");
  const [size, setSize] = useState<PortalSize>(7);
  const [charges, setCharges] = useState<number | null>(null);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/avalon-zones`).then((r) => r.json()).then(setAvalonZones).catch(() => {});
  }, []);

  async function submit() {
    const c1 = conn1.trim();
    const c2 = conn2.trim();
    if (!c1 || !c2) { setError(t("modal.portal_error_fill")); return; }
    if (c1.toLowerCase() === c2.toLowerCase()) { setError(t("modal.portal_error_same")); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/avalon-portals`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guild_id: guildId,
          conn1: c1,
          conn2: c2,
          size,
          hours: size === 0 ? 0 : hours,
          minutes: size === 0 ? 0 : minutes,
          charges: charges,
          reported_by_name: "web",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSuccess();
    } catch {
      setError(t("common.error_unknown"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 400, background: "#111116", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
          <MIcon name="hub" size={18} color="#CC44FF" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#ddd" }}>{t("modal.portal_title")}</div>
            <div style={{ fontSize: 11, color: "#444", marginTop: 1 }}>{t("modal.portal_subtitle")}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex" }}>
            <MIcon name="close" size={18} color="#555" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 16px 4px" }}>
          <ZoneField label={t("modal.portal_zone_a")} value={conn1} onChange={setConn1} placeholder="TNL-001 ou zona do mundo..." worldZones={zones} avalonZones={avalonZones} />
          <ZoneField label={t("modal.portal_zone_b")} value={conn2} onChange={setConn2} placeholder="TNL-002 ou zona do mundo..." worldZones={zones} avalonZones={avalonZones} />

          {/* Size selector */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("modal.portal_size")}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {SIZES.map((s) => {
                const active = size === s;
                const color = PORTAL_SIZE_COLOR[s];
                return (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    style={{
                      flex: 1, padding: "7px 4px", borderRadius: 8, border: `1.5px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
                      background: active ? `${color}22` : "rgba(255,255,255,0.04)",
                      color: active ? color : "#666", fontSize: 11, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {PORTAL_SIZE_LABEL[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timer — hidden for Royal */}
          {size !== 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("modal.hours")}</div>
                <input
                  type="number" min={0} max={24} value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#ddd", fontSize: 12, outline: "none" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("modal.minutes")}</div>
                <input
                  type="number" min={0} max={59} value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#ddd", fontSize: 12, outline: "none" }}
                />
              </div>
            </div>
          )}

          {/* Charges remaining */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("modal.portal_charges")}</div>
            <input
              type="number" min={1} max={500}
              value={charges ?? ""}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                setCharges(isNaN(v) ? null : Math.max(1, v));
              }}
              placeholder={t("modal.portal_charges_placeholder")}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#ddd", fontSize: 12, outline: "none" }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#f87171", marginBottom: 10, padding: "6px 10px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.15)" }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "10px 16px 14px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "#888", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              padding: "7px 18px", borderRadius: 8,
              background: submitting ? "#333" : "rgba(204,68,255,0.2)",
              color: submitting ? "#555" : "#CC44FF",
              fontSize: 12, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
              border: `1px solid ${submitting ? "transparent" : "rgba(204,68,255,0.35)"}`,
            }}
          >
            {submitting ? t("modal.submitting") : t("modal.register")}
          </button>
        </div>
      </div>
    </div>
  );
}
