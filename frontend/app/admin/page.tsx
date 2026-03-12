"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Inter } from "next/font/google";
import FloatingLangSwitcher from "../components/FloatingLangSwitcher";
import useSWR from "swr";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

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
  total_guilds: number;
  total_members: number;
};
type AdminGuild = {
  guild_id: string; guild_name: string;
  member_count: number; tracker_count: number; server_region: string;
};
type AdminGuildMember = { id: string; discord_username: string; last_seen_at: string | null };
type AdminUser = { id: number; discord_id: string; username: string; created_at: string; };

// ── Utils ─────────────────────────────────────────────────────────────────────

const REGION_LABEL: Record<string, string> = { WEST: "🌎 WEST", EAST: "🌍 EAST", ASIA: "🌏 ASIA" };

function Pill({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}1a`, border: `1px solid ${color}44`, borderRadius: 999, padding: "2px 9px", letterSpacing: 0.3 }}>{label}</span>;
}
function StatCard({ title, value, sub, color = "#5865F2" }: { title: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#111111", border: "1px solid #1F1F1F", borderRadius: 14, padding: "18px 20px", flex: 1, minWidth: 120 }}>
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
  return <div style={{ width: "100%", maxWidth: 440, background: "#111111", border: "1px solid #1F1F1F", borderRadius: 16, padding: "28px 24px" }}><div style={{ fontWeight: 800, fontSize: 16, color: "#fff", marginBottom: 20 }}>{title}</div>{children}</div>;
}
function ModalButtons({ onClose, loading, confirmLabel }: { onClose: () => void; loading: boolean; confirmLabel: string }) {
  const t = useTranslations();
  return <div style={{ display: "flex", gap: 10, marginTop: 4 }}><button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t('common.cancel')}</button><button type="submit" disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: loading ? "rgba(88,101,242,0.4)" : "#5865F2", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>{loading ? t('common.saving') : confirmLabel}</button></div>;
}
const td: React.CSSProperties = { padding: "10px 12px", color: "#ccd", verticalAlign: "middle" };
const thStyle: React.CSSProperties = { padding: "8px 12px", textAlign: "left", color: "rgba(255,255,255,0.35)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600 };
const btnPrimary: React.CSSProperties = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#5865F2", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnSm: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1px solid #1F1F1F", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const inp = { background: "rgba(255,255,255,0.04)", border: "1px solid #1F1F1F", borderRadius: 8, padding: "9px 12px", color: "#eee", fontSize: 13, width: "100%", boxSizing: "border-box" } as React.CSSProperties;

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
        <StatCard title={t('admin.stat_members')} value={data.total_members} color="#a78bfa" />
      </div>
    </div>
  );
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

function GuildRow({ g, onMutate }: { g: AdminGuild; onMutate: () => void }) {
  const t = useTranslations();
  const [showMembers, setShowMembers] = useState(false);
  const [editRegion, setEditRegion] = useState(false);
  const { data: members } = useSWR<AdminGuildMember[]>(
    showMembers ? `${API_BASE}/admin/guilds/${g.guild_id}/members` : null,
    fetcher,
  );
  const regionLabel = REGION_LABEL[g.server_region] ?? g.server_region ?? "—";
  return (
    <>
      <tr style={{ borderBottom: showMembers ? "none" : "1px solid #1F1F1F" }}>
        <td style={td}>{g.guild_name}<div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{g.guild_id}</div></td>
        <td style={td}>{g.member_count}</td>
        <td style={td}>{g.tracker_count}</td>
        <td style={td}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#a3e635", background: "rgba(163,230,53,0.08)", border: "1px solid rgba(163,230,53,0.25)", borderRadius: 4, padding: "2px 7px" }}>
            {regionLabel}
          </span>
        </td>
        <td style={{ ...td, whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
            <button onClick={() => setEditRegion(true)} style={btnSm}>{t('admin.edit_region')}</button>
            <a href={`/map/${g.guild_id}`} target="_blank" rel="noopener noreferrer" style={{ ...btnSm, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>{t('admin.view_map')}</a>
            <button onClick={() => setShowMembers(v => !v)} style={{ ...btnSm, color: showMembers ? "#a0a9ff" : undefined }}>{t('admin.members_list')}</button>
          </div>
        </td>
      </tr>
      {showMembers && (
        <tr style={{ borderBottom: "1px solid #1F1F1F" }}>
          <td colSpan={5} style={{ padding: "0 12px 12px 12px", background: "rgba(0,0,0,0.3)" }}>
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t('admin.members_title')} — <span style={{ color: "#ccd" }}>{g.member_count}</span>
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
  if (error) return <p style={{ color: "#f87171" }}>{error.message}</p>;
  if (!data) return <p style={{ color: "rgba(255,255,255,0.3)" }}>{t('common.loading')}</p>;
  return <>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: "1px solid #1F1F1F" }}>{[t('admin.col_server'), t('admin.col_members'), t('admin.col_trackers'), t('admin.col_region'), ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
        <tbody>{data.map(g => (
          <GuildRow key={g.guild_id} g={g} onMutate={() => mutate()} />
        ))}</tbody>
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
        <thead><tr style={{ borderBottom: "1px solid #1F1F1F" }}>{[t('admin.col_discord_id'), t('admin.col_username'), t('admin.col_added_at'), ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
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

const TABS_KEYS = ["overview", "servers", "admins"] as const;
type TabKey = (typeof TABS_KEYS)[number];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const tabLabels: Record<TabKey, string> = {
    overview: t('admin.tab_overview'),
    servers: t('admin.tab_servers'),
    admins: t('admin.tab_admins'),
  };

  const tabContent: Record<TabKey, React.ReactNode> = {
    overview: <OverviewTab />,
    servers:  <GuildsTab />,
    admins:   <AdminsTab />,
  };

  return (
    <div className={inter.className} style={{ minHeight: "100vh", background: "#0D0D0D", color: "#E0E0E0" }}>

      {/* Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(13,13,13,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1F1F1F", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/brand/icon.png" alt="Ultimate Tracker" height={34} style={{ display: "block", width: "auto" }} />
          </Link>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#5865F2", background: "rgba(88,101,242,0.15)", border: "1px solid rgba(88,101,242,0.3)", borderRadius: 6, padding: "2px 8px", letterSpacing: 0.5 }}>{t('admin.badge')}</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: "#8A8A8A", textDecoration: "none" }}>{t('admin.dashboard_link')}</Link>
          <Link href="/admin/zones" style={{ fontSize: 13, color: "#8A8A8A", textDecoration: "none" }}>{t('admin.zone_centers_link')}</Link>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#fff" }}>{t('admin.page_title')}</h1>
          <p style={{ margin: 0, fontSize: 13, color: "#8A8A8A" }}>{t('admin.page_subtitle')}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #1F1F1F", marginBottom: 28 }}>
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

      <FloatingLangSwitcher />
    </div>
  );
}
