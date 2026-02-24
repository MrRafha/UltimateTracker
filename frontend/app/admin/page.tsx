"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useSWR from "swr";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

const swrOpts = { refreshInterval: 30_000 };
const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then(async (r) => {
    if (!r.ok) {
      const err: any = new Error(await r.text().catch(() => `HTTP ${r.status}`));
      err.status = r.status;
      throw err;
    }
    return r.json();
  });

// ── Types ─────────────────────────────────────────────────────────────────────

type Stats = {
  total_guilds: number; active_guilds: number; trial_guilds: number;
  expired_guilds: number; no_plan_guilds: number;
  total_members: number; total_keys: number; used_keys: number;
};
type AdminGuild = {
  guild_id: string; guild_name: string;
  plan: string | null; plan_status: string | null; plan_expires_at: string | null;
  member_count: number; tracker_count: number; server_region: string;
};
type AdminGuildMember = { id: string; discord_username: string; last_seen_at: string | null };
type Key = {
  id: number; key: string; plan: string; duration_days: number;
  is_trial: boolean; is_used: boolean; used_by_guild_id: string | null;
  used_at: string | null; note: string | null; created_at: string;
};
type AdminUser = { id: number; discord_id: string; username: string; created_at: string; };

// ── Utils ─────────────────────────────────────────────────────────────────────

const PLAN_COLOR: Record<string, string> = { basic: "#22cc77", plus: "#5865F2", premium: "#FFD700" };
const STATUS_COLOR: Record<string, string> = { active: "#22cc77", trial: "#f59e0b", expired: "#ef4444" };
const PLAN_MEMBER_LIMIT: Record<string, number> = { basic: 5, plus: 10, premium: 30 };
const REGION_LABEL: Record<string, string> = { WEST: "🌎 WEST", EAST: "🌍 EAST", ASIA: "🌏 ASIA" };

function Pill({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}1a`, border: `1px solid ${color}44`, borderRadius: 999, padding: "2px 9px", letterSpacing: 0.3 }}>{label}</span>;
}
function StatCard({ title, value, sub, color = "#5865F2" }: { title: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 20px", flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
async function apiFetch(path: string, method = "GET", body?: object) {
  const res = await fetch(`${API_BASE}${path}`, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail ?? `HTTP ${res.status}`); }
  return res.status === 204 ? null : res.json();
}

// ── Shared Modal UI ───────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>{children}</div>;
}
function ModalBox({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ width: "100%", maxWidth: 440, background: "#16181f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "28px 24px", fontFamily: "system-ui" }}><div style={{ fontWeight: 800, fontSize: 16, color: "#fff", marginBottom: 20 }}>{title}</div>{children}</div>;
}
function ModalButtons({ onClose, loading, confirmLabel }: { onClose: () => void; loading: boolean; confirmLabel: string }) {
  const t = useTranslations();
  return <div style={{ display: "flex", gap: 10, marginTop: 4 }}><button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t('common.cancel')}</button><button type="submit" disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: loading ? "rgba(88,101,242,0.4)" : "#5865F2", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>{loading ? t('common.saving') : confirmLabel}</button></div>;
}
const td: React.CSSProperties = { padding: "10px 12px", color: "#ccd", verticalAlign: "middle" };
const thStyle: React.CSSProperties = { padding: "8px 12px", textAlign: "left", color: "rgba(255,255,255,0.35)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600 };
const btnPrimary: React.CSSProperties = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#5865F2", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnSm: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const inp = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, width: "100%", boxSizing: "border-box" } as React.CSSProperties;

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const t = useTranslations();
  const { data, error } = useSWR<Stats>(`${API_BASE}/admin/stats`, fetcher, swrOpts);
  if (error) return <p style={{ color: "#f87171" }}>{error.message}</p>;
  if (!data) return <p style={{ color: "rgba(255,255,255,0.3)" }}>{t('common.loading')}</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard title={t('admin.stat_servers')} value={data.total_guilds} />
        <StatCard title={t('admin.stat_active')} value={data.active_guilds} color="#22cc77" />
        <StatCard title={t('admin.stat_trial')} value={data.trial_guilds} color="#f59e0b" />
        <StatCard title={t('admin.stat_expired')} value={data.expired_guilds} color="#ef4444" />
        <StatCard title={t('admin.stat_no_plan')} value={data.no_plan_guilds} color="#555" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard title={t('admin.stat_members')} value={data.total_members} color="#a78bfa" />
        <StatCard title={t('admin.stat_total_keys')} value={data.total_keys} color="#38bdf8" />
        <StatCard title={t('admin.stat_used_keys')} value={data.used_keys} color="#fb923c" sub={`${data.total_keys - data.used_keys} ${t('admin.stat_available')}`} />
      </div>
    </div>
  );
}

// ── Edit Plan Modal ───────────────────────────────────────────────────────────

function EditPlanModal({ guild, onClose, onSave }: { guild: AdminGuild; onClose: () => void; onSave: () => void }) {
  const t = useTranslations();
  const [plan, setPlan] = useState(guild.plan ?? "basic");
  const [status, setStatus] = useState(guild.plan_status ?? "active");
  const [expires, setExpires] = useState(guild.plan_expires_at ? guild.plan_expires_at.slice(0, 10) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try { await apiFetch(`/admin/guilds/${guild.guild_id}/plan`, "PATCH", { plan, plan_status: status, plan_expires_at: expires || null }); onSave(); }
    catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <Overlay onClose={onClose}><ModalBox title={t('admin.edit_plan_title', { guild_name: guild.guild_name })}><form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}><label style={labelStyle}>{t('admin.field_plan')}<select value={plan} onChange={e => setPlan(e.target.value)} style={inp}><option value="basic">{t('admin.option_basic')}</option><option value="plus">{t('admin.option_plus')}</option><option value="premium">{t('admin.option_premium')}</option></select></label><label style={labelStyle}>{t('admin.field_status')}<select value={status} onChange={e => setStatus(e.target.value)} style={inp}><option value="active">{t('admin.option_active')}</option><option value="trial">{t('admin.option_trial')}</option><option value="expired">{t('admin.option_expired')}</option></select></label><label style={labelStyle}>{t('admin.field_expires')}<input type="date" value={expires} onChange={e => setExpires(e.target.value)} style={inp} /></label>{error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}<ModalButtons onClose={onClose} loading={loading} confirmLabel={t('common.save')} /></form></ModalBox></Overlay>;
}

// ── Edit Region Modal ────────────────────────────────────────────────────────

function EditRegionModal({ guild, onClose, onSave }: { guild: AdminGuild; onClose: () => void; onSave: () => void }) {
  const t = useTranslations();
  const [region, setRegion] = useState(guild.server_region ?? "WEST");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try { await apiFetch(`/admin/guilds/${guild.guild_id}/settings`, "PATCH", { server_region: region }); onSave(); }
    catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }
  return <Overlay onClose={onClose}><ModalBox title={t('admin.edit_region_title', { guild_name: guild.guild_name })}><form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <label style={labelStyle}>{t('dashboard.server_label')}<select value={region} onChange={e => setRegion(e.target.value)} style={inp}><option value="WEST">{t('dashboard.server_west')}</option><option value="EAST">{t('dashboard.server_east')}</option><option value="ASIA">{t('dashboard.server_asia')}</option></select></label>
    {error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}
    <ModalButtons onClose={onClose} loading={loading} confirmLabel={t('common.save')} />
  </form></ModalBox></Overlay>;
}

// ── Guild Row (with collapsible members panel) ────────────────────────────────

function GuildRow({ g, onEditPlan, onMutate }: { g: AdminGuild; onEditPlan: () => void; onMutate: () => void }) {
  const t = useTranslations();
  const [showMembers, setShowMembers] = useState(false);
  const [editRegion, setEditRegion] = useState(false);
  const { data: members } = useSWR<AdminGuildMember[]>(
    showMembers ? `${API_BASE}/admin/guilds/${g.guild_id}/members` : null,
    fetcher,
  );
  const limit = PLAN_MEMBER_LIMIT[g.plan ?? ""] ?? 0;
  const overLimit = limit > 0 && g.member_count > limit;
  const regionLabel = REGION_LABEL[g.server_region] ?? g.server_region ?? "—";
  return (
    <>
      <tr style={{ borderBottom: showMembers ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
        <td style={td}>{g.guild_name}<div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{g.guild_id}</div></td>
        <td style={td}>{g.plan ? <Pill label={g.plan.toUpperCase()} color={PLAN_COLOR[g.plan] ?? "#888"} /> : <span style={{ color: "#444" }}>—</span>}</td>
        <td style={td}>{g.plan_status ? <Pill label={g.plan_status.toUpperCase()} color={STATUS_COLOR[g.plan_status] ?? "#888"} /> : <span style={{ color: "#444" }}>—</span>}</td>
        <td style={td}>{g.plan_expires_at ? g.plan_expires_at.slice(0, 10) : <span style={{ color: "#444" }}>—</span>}</td>
        <td style={td}>
          <span style={{ color: overLimit ? "#ef4444" : "#ccd" }}>{g.member_count}</span>
          {limit > 0 && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 3 }}>/ {limit}</span>}
        </td>
        <td style={td}>{g.tracker_count}</td>
        <td style={td}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#a3e635", background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.25)", borderRadius: 4, padding: "2px 7px" }}>
            {regionLabel}
          </span>
        </td>
        <td style={{ ...td, whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
            <button onClick={onEditPlan} style={btnSm}>{t('admin.edit')}</button>
            <button onClick={() => setEditRegion(true)} style={btnSm}>{t('admin.edit_region')}</button>
            <a href={`/map/${g.guild_id}`} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>{t('admin.view_map')}</a>
            <button onClick={() => setShowMembers(v => !v)} style={{ ...btnSm, color: showMembers ? "#a0a9ff" : undefined }}>{t('admin.members_list')}</button>
          </div>
        </td>
      </tr>
      {showMembers && (
        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <td colSpan={8} style={{ padding: "0 12px 12px 12px", background: "rgba(0,0,0,0.2)" }}>
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t('admin.members_title')} — <span style={{ color: overLimit ? "#ef4444" : "#ccd" }}>{g.member_count}</span>
                {limit > 0 && <span style={{ color: "rgba(255,255,255,0.3)" }}>/{limit}</span>}
              </div>
              {!members && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{t('common.loading')}</div>}
              {members && members.length === 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{t('admin.no_members')}</div>}
              {members && members.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {members.map(m => (
                    <div key={m.id} style={{ fontSize: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 10px" }}>
                      <span style={{ fontWeight: 600, color: "#ddd" }}>{m.discord_username}</span>
                      {m.last_seen_at && <span style={{ marginLeft: 6, color: "rgba(255,255,255,0.3)", fontSize: 10 }}>{m.last_seen_at.slice(0, 10)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
      {editRegion && <EditRegionModal guild={g} onClose={() => setEditRegion(false)} onSave={() => { setEditRegion(false); onMutate(); }} />}
    </>
  );
}

// ── Guilds Tab ────────────────────────────────────────────────────────────────

function GuildsTab() {
  const t = useTranslations();
  const { data, error, mutate } = useSWR<AdminGuild[]>(`${API_BASE}/admin/guilds`, fetcher, swrOpts);
  const [editing, setEditing] = useState<AdminGuild | null>(null);
  if (error) return <p style={{ color: "#f87171" }}>{error.message}</p>;
  if (!data) return <p style={{ color: "rgba(255,255,255,0.3)" }}>{t('common.loading')}</p>;
  return <>
    {editing && <EditPlanModal guild={editing} onClose={() => setEditing(null)} onSave={() => { setEditing(null); mutate(); }} />}
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{[t('admin.col_server'), t('admin.col_plan'), t('admin.col_status'), t('admin.col_expires'), t('admin.col_members'), t('admin.col_trackers'), t('admin.col_region'), ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
        <tbody>{data.map(g => (
          <GuildRow key={g.guild_id} g={g} onEditPlan={() => setEditing(g)} onMutate={() => mutate()} />
        ))}</tbody>
      </table>
    </div>
  </>;
}

// ── Keys Tab ──────────────────────────────────────────────────────────────────

function NewKeyModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const t = useTranslations();
  const [plan, setPlan] = useState("basic"); const [days, setDays] = useState("30");
  const [trial, setTrial] = useState(false); const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try { await apiFetch("/admin/keys", "POST", { plan, duration_days: parseInt(days), is_trial: trial, note: note || null }); onSave(); }
    catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }
  return <Overlay onClose={onClose}><ModalBox title={t('admin.new_key_title')}><form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <label style={labelStyle}>{t('admin.field_plan')}<select value={plan} onChange={e => setPlan(e.target.value)} style={inp}><option value="basic">{t('admin.option_basic')}</option><option value="plus">{t('admin.option_plus')}</option><option value="premium">{t('admin.option_premium')}</option></select></label>
    <label style={labelStyle}>{t('admin.field_duration_days')}<input type="number" min={1} value={days} onChange={e => setDays(e.target.value)} style={inp} /></label>
    <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" checked={trial} onChange={e => setTrial(e.target.checked)} />{t('admin.field_is_trial')}</label>
    <label style={labelStyle}>{t('admin.field_note')}<input value={note} onChange={e => setNote(e.target.value)} placeholder={t('admin.note_placeholder')} style={inp} /></label>
    {error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}
    <ModalButtons onClose={onClose} loading={loading} confirmLabel={t('admin.create')} />
  </form></ModalBox></Overlay>;
}

function KeysTab() {
  const t = useTranslations();
  const { data, error, mutate } = useSWR<Key[]>(`${API_BASE}/admin/keys`, fetcher, swrOpts);
  const [showNew, setShowNew] = useState(false);
  async function deleteKey(id: number) { if (!confirm(t('admin.confirm_remove_key'))) return; await apiFetch(`/admin/keys/${id}`, "DELETE"); mutate(); }
  if (error) return <p style={{ color: "#f87171" }}>{error.message}</p>;
  if (!data) return <p style={{ color: "rgba(255,255,255,0.3)" }}>{t('common.loading')}</p>;
  return <>
    {showNew && <NewKeyModal onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); mutate(); }} />}
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><button onClick={() => setShowNew(true)} style={btnPrimary}>{t('admin.add_key_btn')}</button></div>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{[t('admin.col_key'), t('admin.col_plan'), t('admin.col_days'), t('admin.col_is_trial'), t('admin.col_status'), t('admin.col_used_by'), t('admin.col_created'), t('admin.col_note'), ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
        <tbody>{data.map(k => <tr key={k.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: k.is_used ? 0.45 : 1 }}>
          <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{k.key}</td>
          <td style={td}><Pill label={k.plan.toUpperCase()} color={PLAN_COLOR[k.plan] ?? "#888"} /></td>
          <td style={td}>{k.duration_days}d</td>
          <td style={td}>{k.is_trial ? <Pill label="TRIAL" color="#f59e0b" /> : <span style={{ color: "#444" }}>—</span>}</td>
          <td style={td}>{k.is_used ? <Pill label={t('admin.key_used')} color="#ef4444" /> : <Pill label={t('admin.key_free')} color="#22cc77" />}</td>
          <td style={td}>{k.used_by_guild_id ?? <span style={{ color: "#444" }}>—</span>}</td>
          <td style={td}>{k.created_at.slice(0, 10)}</td>
          <td style={td}>{k.note ?? <span style={{ color: "#444" }}>—</span>}</td>
          <td style={td}>{!k.is_used && <button onClick={() => deleteKey(k.id)} style={btnDanger}>{t('admin.remove')}</button>}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}

// ── Admins Tab ────────────────────────────────────────────────────────────────

function AddAdminModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const t = useTranslations();
  const [discordId, setDiscordId] = useState(""); const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try { await apiFetch("/admin/users", "POST", { discord_id: discordId, username }); onSave(); }
    catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }
  return <Overlay onClose={onClose}><ModalBox title={t('admin.add_admin_title')}><form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <label style={labelStyle}>{t('admin.field_discord_id')}<input value={discordId} onChange={e => setDiscordId(e.target.value)} placeholder="1234567890" style={inp} required /></label>
    <label style={labelStyle}>{t('admin.field_username')}<input value={username} onChange={e => setUsername(e.target.value)} placeholder="usuario#0" style={inp} required /></label>
    {error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}
    <ModalButtons onClose={onClose} loading={loading} confirmLabel={t('admin.add')} />
  </form></ModalBox></Overlay>;
}

function AdminsTab() {
  const t = useTranslations();
  const { data, error, mutate } = useSWR<AdminUser[]>(`${API_BASE}/admin/users`, fetcher, swrOpts);
  const [showAdd, setShowAdd] = useState(false);
  async function deleteAdmin(id: number) { if (!confirm(t('admin.confirm_remove_admin'))) return; await apiFetch(`/admin/users/${id}`, "DELETE"); mutate(); }
  if (error) return <p style={{ color: "#f87171" }}>{error.message}</p>;
  if (!data) return <p style={{ color: "rgba(255,255,255,0.3)" }}>{t('common.loading')}</p>;
  return <>
    {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); mutate(); }} />}
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><button onClick={() => setShowAdd(true)} style={btnPrimary}>{t('admin.add_admin_btn')}</button></div>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{[t('admin.col_discord_id'), t('admin.col_username'), t('admin.col_added_at'), ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
        <tbody>{data.map(u => <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{u.discord_id}</td>
          <td style={td}>{u.username}</td>
          <td style={td}>{u.created_at.slice(0, 10)}</td>
          <td style={td}><button onClick={() => deleteAdmin(u.id)} style={btnDanger}>{t('admin.remove')}</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS_KEYS = ["overview", "servers", "keys", "admins"] as const;
type TabKey = (typeof TABS_KEYS)[number];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const tabLabels: Record<TabKey, string> = {
    overview: t('admin.tab_overview'),
    servers: t('admin.tab_servers'),
    keys: t('admin.tab_keys'),
    admins: t('admin.tab_admins'),
  };

  const tabContent: Record<TabKey, React.ReactNode> = {
    overview: <OverviewTab />,
    servers:  <GuildsTab />,
    keys:     <KeysTab />,
    admins:   <AdminsTab />,
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 0%, rgba(88,101,242,0.08) 0%, #0a0a0f 55%)", fontFamily: "system-ui, -apple-system, sans-serif", color: "#e0e0e0" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/brand/icon.png" alt="Ultimate Tracker" height={34} style={{ display: "block", width: "auto" }} />
          </Link>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#5865F2", background: "rgba(88,101,242,0.15)", border: "1px solid rgba(88,101,242,0.3)", borderRadius: 6, padding: "2px 8px", letterSpacing: 0.5 }}>{t('admin.badge')}</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <LanguageSwitcher />
          <Link href="/dashboard" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>{t('admin.dashboard_link')}</Link>
          <Link href="/admin/zones" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>{t('admin.zone_centers_link')}</Link>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#fff" }}>{t('admin.page_title')}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{t('admin.page_subtitle')}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 28 }}>
          {TABS_KEYS.map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setActiveTab(tabKey)}
              style={{ padding: "10px 18px", borderRadius: "8px 8px 0 0", border: "none", background: activeTab === tabKey ? "rgba(88,101,242,0.15)" : "transparent", color: activeTab === tabKey ? "#a0a9ff" : "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: activeTab === tabKey ? 700 : 500, cursor: "pointer", borderBottom: activeTab === tabKey ? "2px solid #5865F2" : "2px solid transparent", transition: "all 0.15s" }}
            >
              {tabLabels[tabKey]}
            </button>
          ))}
        </div>

        {tabContent[activeTab]}
      </main>
    </div>
  );
}
