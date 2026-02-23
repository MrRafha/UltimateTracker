"use client";

import { useState } from "react";
import Link from "next/link";
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
  member_count: number; tracker_count: number;
};
type Key = {
  id: number; key: string; plan: string; duration_days: number;
  is_trial: boolean; is_used: boolean; used_by_guild_id: string | null;
  used_at: string | null; note: string | null; created_at: string;
};
type AdminUser = { id: number; discord_id: string; username: string; created_at: string; };

// ── Utils ─────────────────────────────────────────────────────────────────────

const PLAN_COLOR: Record<string, string> = { basic: "#22cc77", plus: "#5865F2", premium: "#FFD700" };
const STATUS_COLOR: Record<string, string> = { active: "#22cc77", trial: "#f59e0b", expired: "#ef4444" };

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
  return <div style={{ display: "flex", gap: 10, marginTop: 4 }}><button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancelar</button><button type="submit" disabled={loading} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: loading ? "rgba(88,101,242,0.4)" : "#5865F2", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>{loading ? "Salvando…" : confirmLabel}</button></div>;
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
  const { data, error } = useSWR<Stats>(`${API_BASE}/admin/stats`, fetcher, swrOpts);
  if (error) return <p style={{ color: "#f87171" }}>{error.message}</p>;
  if (!data) return <p style={{ color: "rgba(255,255,255,0.3)" }}>Carregando...</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard title="Servidores" value={data.total_guilds} />
        <StatCard title="Ativos" value={data.active_guilds} color="#22cc77" />
        <StatCard title="Trial" value={data.trial_guilds} color="#f59e0b" />
        <StatCard title="Expirados" value={data.expired_guilds} color="#ef4444" />
        <StatCard title="Sem plano" value={data.no_plan_guilds} color="#555" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard title="Membros" value={data.total_members} color="#a78bfa" />
        <StatCard title="Keys totais" value={data.total_keys} color="#38bdf8" />
        <StatCard title="Keys usadas" value={data.used_keys} color="#fb923c" sub={`${data.total_keys - data.used_keys} disponíveis`} />
      </div>
    </div>
  );
}

// ── Edit Plan Modal ───────────────────────────────────────────────────────────

function EditPlanModal({ guild, onClose, onSave }: { guild: AdminGuild; onClose: () => void; onSave: () => void }) {
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
  return <Overlay onClose={onClose}><ModalBox title={`Editar plano — ${guild.guild_name}`}><form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}><label style={labelStyle}>Plano<select value={plan} onChange={e => setPlan(e.target.value)} style={inp}><option value="basic">Básico</option><option value="plus">Plus</option><option value="premium">Premium</option></select></label><label style={labelStyle}>Status<select value={status} onChange={e => setStatus(e.target.value)} style={inp}><option value="active">Ativo</option><option value="trial">Trial</option><option value="expired">Expirado</option></select></label><label style={labelStyle}>Expira em<input type="date" value={expires} onChange={e => setExpires(e.target.value)} style={inp} /></label>{error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}<ModalButtons onClose={onClose} loading={loading} confirmLabel="Salvar" /></form></ModalBox></Overlay>;
}

// ── Guilds Tab ────────────────────────────────────────────────────────────────

function GuildsTab() {
  const { data, error, mutate } = useSWR<AdminGuild[]>(`${API_BASE}/admin/guilds`, fetcher, swrOpts);
  const [editing, setEditing] = useState<AdminGuild | null>(null);
  if (error) return <p style={{ color: "#f87171" }}>{error.message}</p>;
  if (!data) return <p style={{ color: "rgba(255,255,255,0.3)" }}>Carregando...</p>;
  return <>
    {editing && <EditPlanModal guild={editing} onClose={() => setEditing(null)} onSave={() => { setEditing(null); mutate(); }} />}
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{["Servidor", "Plano", "Status", "Expira", "Membros", "Trackers", ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
        <tbody>{data.map(g => <tr key={g.guild_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <td style={td}>{g.guild_name}<div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{g.guild_id}</div></td>
          <td style={td}>{g.plan ? <Pill label={g.plan.toUpperCase()} color={PLAN_COLOR[g.plan] ?? "#888"} /> : <span style={{ color: "#444" }}>—</span>}</td>
          <td style={td}>{g.plan_status ? <Pill label={g.plan_status.toUpperCase()} color={STATUS_COLOR[g.plan_status] ?? "#888"} /> : <span style={{ color: "#444" }}>—</span>}</td>
          <td style={td}>{g.plan_expires_at ? g.plan_expires_at.slice(0, 10) : <span style={{ color: "#444" }}>—</span>}</td>
          <td style={td}>{g.member_count}</td><td style={td}>{g.tracker_count}</td>
          <td style={td}><button onClick={() => setEditing(g)} style={btnSm}>Editar</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}

// ── Keys Tab ──────────────────────────────────────────────────────────────────

function NewKeyModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [plan, setPlan] = useState("basic"); const [days, setDays] = useState("30");
  const [trial, setTrial] = useState(false); const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try { await apiFetch("/admin/keys", "POST", { plan, duration_days: parseInt(days), is_trial: trial, note: note || null }); onSave(); }
    catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }
  return <Overlay onClose={onClose}><ModalBox title="Nova Chave de Ativação"><form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <label style={labelStyle}>Plano<select value={plan} onChange={e => setPlan(e.target.value)} style={inp}><option value="basic">Básico</option><option value="plus">Plus</option><option value="premium">Premium</option></select></label>
    <label style={labelStyle}>Duração (dias)<input type="number" min={1} value={days} onChange={e => setDays(e.target.value)} style={inp} /></label>
    <label style={{ ...labelStyle, flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" checked={trial} onChange={e => setTrial(e.target.checked)} />É trial</label>
    <label style={labelStyle}>Nota<input value={note} onChange={e => setNote(e.target.value)} placeholder="ex: key para servidor X" style={inp} /></label>
    {error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}
    <ModalButtons onClose={onClose} loading={loading} confirmLabel="Criar" />
  </form></ModalBox></Overlay>;
}

function KeysTab() {
  const { data, error, mutate } = useSWR<Key[]>(`${API_BASE}/admin/keys`, fetcher, swrOpts);
  const [showNew, setShowNew] = useState(false);
  async function deleteKey(id: number) { if (!confirm("Remover esta key?")) return; await apiFetch(`/admin/keys/${id}`, "DELETE"); mutate(); }
  if (error) return <p style={{ color: "#f87171" }}>{error.message}</p>;
  if (!data) return <p style={{ color: "rgba(255,255,255,0.3)" }}>Carregando...</p>;
  return <>
    {showNew && <NewKeyModal onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); mutate(); }} />}
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><button onClick={() => setShowNew(true)} style={btnPrimary}>＋ Nova Key</button></div>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{["Chave", "Plano", "Dias", "Trial", "Status", "Usado por", "Criada", "Nota", ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
        <tbody>{data.map(k => <tr key={k.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", opacity: k.is_used ? 0.45 : 1 }}>
          <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{k.key}</td>
          <td style={td}><Pill label={k.plan.toUpperCase()} color={PLAN_COLOR[k.plan] ?? "#888"} /></td>
          <td style={td}>{k.duration_days}d</td>
          <td style={td}>{k.is_trial ? <Pill label="TRIAL" color="#f59e0b" /> : <span style={{ color: "#444" }}>—</span>}</td>
          <td style={td}>{k.is_used ? <Pill label="USADA" color="#ef4444" /> : <Pill label="LIVRE" color="#22cc77" />}</td>
          <td style={td}>{k.used_by_guild_id ?? <span style={{ color: "#444" }}>—</span>}</td>
          <td style={td}>{k.created_at.slice(0, 10)}</td>
          <td style={td}>{k.note ?? <span style={{ color: "#444" }}>—</span>}</td>
          <td style={td}>{!k.is_used && <button onClick={() => deleteKey(k.id)} style={btnDanger}>Remover</button>}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}

// ── Admins Tab ────────────────────────────────────────────────────────────────

function AddAdminModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [discordId, setDiscordId] = useState(""); const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try { await apiFetch("/admin/users", "POST", { discord_id: discordId, username }); onSave(); }
    catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }
  return <Overlay onClose={onClose}><ModalBox title="Adicionar Administrador"><form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
    <label style={labelStyle}>Discord ID<input value={discordId} onChange={e => setDiscordId(e.target.value)} placeholder="1234567890" style={inp} required /></label>
    <label style={labelStyle}>Username<input value={username} onChange={e => setUsername(e.target.value)} placeholder="usuario#0" style={inp} required /></label>
    {error && <div style={{ fontSize: 12, color: "#f87171" }}>{error}</div>}
    <ModalButtons onClose={onClose} loading={loading} confirmLabel="Adicionar" />
  </form></ModalBox></Overlay>;
}

function AdminsTab() {
  const { data, error, mutate } = useSWR<AdminUser[]>(`${API_BASE}/admin/users`, fetcher, swrOpts);
  const [showAdd, setShowAdd] = useState(false);
  async function deleteAdmin(id: number) { if (!confirm("Remover este admin?")) return; await apiFetch(`/admin/users/${id}`, "DELETE"); mutate(); }
  if (error) return <p style={{ color: "#f87171" }}>{error.message}</p>;
  if (!data) return <p style={{ color: "rgba(255,255,255,0.3)" }}>Carregando...</p>;
  return <>
    {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); mutate(); }} />}
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><button onClick={() => setShowAdd(true)} style={btnPrimary}>＋ Adicionar Admin</button></div>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{["Discord ID", "Username", "Adicionado em", ""].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
        <tbody>{data.map(u => <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{u.discord_id}</td>
          <td style={td}>{u.username}</td>
          <td style={td}>{u.created_at.slice(0, 10)}</td>
          <td style={td}><button onClick={() => deleteAdmin(u.id)} style={btnDanger}>Remover</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = ["Visão Geral", "Servidores", "Keys", "Admins"] as const;
type Tab = (typeof TABS)[number];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("Visão Geral");

  const tabContent: Record<Tab, React.ReactNode> = {
    "Visão Geral": <OverviewTab />,
    "Servidores":  <GuildsTab />,
    "Keys":        <KeysTab />,
    "Admins":      <AdminsTab />,
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
          <span style={{ fontSize: 11, fontWeight: 700, color: "#5865F2", background: "rgba(88,101,242,0.15)", border: "1px solid rgba(88,101,242,0.3)", borderRadius: 6, padding: "2px 8px", letterSpacing: 0.5 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link href="/dashboard" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Dashboard</Link>
          <Link href="/admin/zones" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>Zone Centers</Link>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#fff" }}>Painel Admin</h1>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Gerencie planos, chaves e administradores do Ultimate Tracker.</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 28 }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ padding: "10px 18px", borderRadius: "8px 8px 0 0", border: "none", background: activeTab === tab ? "rgba(88,101,242,0.15)" : "transparent", color: activeTab === tab ? "#a0a9ff" : "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: activeTab === tab ? 700 : 500, cursor: "pointer", borderBottom: activeTab === tab ? "2px solid #5865F2" : "2px solid transparent", transition: "all 0.15s" }}
            >
              {tab}
            </button>
          ))}
        </div>

        {tabContent[activeTab]}
      </main>
    </div>
  );
}
