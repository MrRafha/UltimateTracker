"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMe } from "../components/useMe";
import { useMyGuilds } from "../components/useMyGuilds";
import LanguageSwitcher from "../components/LanguageSwitcher";
import type { GuildAccess, ServerRegion } from "../types";



const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";



// ─────────────────────────────────────────────────────────────────────────────



// ── Guild Initial fallback ────────────────────────────────────────────────────



function GuildInitial({ name }: { name: string }) {

  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

  return (

    <div style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0, background: "linear-gradient(135deg, #5865F2 0%, #3b45b8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff", boxShadow: "0 4px 16px rgba(88,101,242,0.35)" }}>

      {initials || "?"}

    </div>

  );

}



// ── Server Region Modal ────────────────────────────────────────────────────────



function ServerRegionModal({ guild, onClose, onSuccess }: {
  guild: GuildAccess;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useTranslations();
  const [region, setRegion] = useState<ServerRegion>(guild.server_region ?? "WEST");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const REGIONS: { value: ServerRegion; label: string; flag: string }[] = [
    { value: "WEST", label: t("dashboard.server_west"), flag: "🌎" },
    { value: "EAST", label: t("dashboard.server_east"), flag: "🌍" },
    { value: "ASIA", label: t("dashboard.server_asia"), flag: "🌏" },
  ];

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/guilds/${guild.guild_id}/settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server_region: region }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Erro ${res.status}`);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error_unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div style={{ width: "100%", maxWidth: 400, background: "#16181f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: "28px 24px", fontFamily: "system-ui" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#fff", marginBottom: 4 }}>{t("dashboard.server_config_title")}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{guild.guild_name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{t("dashboard.server_config_desc")}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {REGIONS.map((r) => {
            const selected = region === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRegion(r.value)}
                style={{
                  padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${selected ? "rgba(88,101,242,0.6)" : "rgba(255,255,255,0.1)"}`,
                  background: selected ? "rgba(88,101,242,0.18)" : "rgba(255,255,255,0.04)",
                  color: selected ? "#aab4ff" : "rgba(255,255,255,0.55)",
                  fontWeight: 700, fontSize: 14, textAlign: "left",
                  display: "flex", alignItems: "center", gap: 10,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 20 }}>{r.flag}</span>
                {r.label}
                {selected && <span style={{ marginLeft: "auto", fontSize: 11, color: "#5865F2" }}>✓</span>}
              </button>
            );
          })}
        </div>

        {error && <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {t("common.cancel")}
          </button>
          <button type="button" disabled={loading} onClick={submit} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: loading ? "rgba(88,101,242,0.4)" : "#5865F2", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer" }}>
            {loading ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}



// ── GuildCard ─────────────────────────────────────────────────────────────────



function GuildCard({ guild, onConfigureRegion }: { guild: GuildAccess; onConfigureRegion: () => void }) {
  const t = useTranslations();
  const { guild_id: guildId, guild_name: guildName, icon } = guild;

  const iconUrl = icon ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.png?size=128` : null;

  return (

    <div

      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14, transition: "border-color 0.15s" }}

      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(88,101,242,0.5)")}

      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}

    >

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

        {iconUrl ? (

          <img src={iconUrl} alt={guildName} width={56} height={56} style={{ borderRadius: 16, flexShrink: 0, objectFit: "cover", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }} />

        ) : (

          <GuildInitial name={guildName} />

        )}

        <div style={{ flex: 1, minWidth: 0 }}>

          <div style={{ fontWeight: 700, fontSize: 15, color: "#f0f0f5", marginBottom: 5 }}>{guildName}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {guild.server_region && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "#5865F2", background: "rgba(88,101,242,0.12)", border: "1px solid rgba(88,101,242,0.3)", borderRadius: 999, padding: "2px 8px", letterSpacing: 0.5 }}>
                {guild.server_region}
              </span>
            )}
          </div>

        </div>

      </div>



      <div style={{ display: "flex", gap: 8 }}>

        <Link

          href={`/map/${guildId}`}

          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #5865F2 0%, #4752c4 100%)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13, padding: "10px 16px", borderRadius: 10, boxShadow: "0 4px 16px rgba(88,101,242,0.25)", transition: "filter 0.15s" }}

          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.12)")}

          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}

        >

          {t("dashboard.open_map")}

        </Link>

        <button

          onClick={onConfigureRegion}

          title={t("dashboard.server_config")}

          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(88,101,242,0.3)", background: "rgba(88,101,242,0.06)", color: "rgba(148,161,255,0.7)", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s" }}

          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(88,101,242,0.14)")}

          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(88,101,242,0.06)")}

        >

          🌐

        </button>

      </div>

    </div>

  );

}



// ── Page ──────────────────────────────────────────────────────────────────────



export default function DashboardPage() {
  const t = useTranslations();
  const router = useRouter();

  const { user, isLoading: userLoading } = useMe();

  const { guilds, isLoading: guildsLoading, isAuthenticated, mutate } = useMyGuilds();

  const [configuringRegionGuild, setConfiguringRegionGuild] = useState<GuildAccess | null>(null);



  const loading = userLoading || guildsLoading;



  useEffect(() => {

    if (!loading && !isAuthenticated) {

      router.replace("/login");

    }

  }, [loading, isAuthenticated, router]);



  if (loading || !isAuthenticated) {

    return (

      <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.25)", fontFamily: "system-ui" }}>

        {t("common.loading")}

      </div>

    );

  }



  const avatarUrl = user?.avatar

    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`

    : null;



  return (

    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 50% 0%, rgba(88,101,242,0.10) 0%, #0a0a0f 55%)", fontFamily: "system-ui, -apple-system, sans-serif", color: "#e0e0e0" }}>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />



      {/* Navbar */}

      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 56 }}>

        <Link href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>

          <img src="/brand/icon.png" alt="Ultimate Tracker" height={36} style={{ display: "block", width: "auto" }} />

        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LanguageSwitcher />

          {avatarUrl ? (

            <img src={avatarUrl} alt={user?.username ?? ""} width={28} height={28} style={{ borderRadius: "50%", display: "block" }} />

          ) : (

            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(88,101,242,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#aab4ff" }}>

              {user?.username?.[0]?.toUpperCase() ?? "?"}

            </div>

          )}

          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{user?.username}</span>

          <a href={`${API_BASE}/auth/logout`} style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.35)", textDecoration: "none", padding: "4px 10px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}>

            {t("common.logout")}

          </a>

        </div>

      </nav>



      {/* Content */}

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 80px" }}>

        <div style={{ marginBottom: 40 }}>

          <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800, color: "#fff" }}>{t("dashboard.title")}</h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>{t("dashboard.subtitle")}</p>

        </div>



        {guilds.length === 0 ? (

          <div style={{ padding: "48px 24px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 16, color: "rgba(255,255,255,0.25)", fontSize: 14 }}>

            {t("dashboard.empty")}

          </div>

        ) : (

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>

            {guilds.map((guild) => (

              <GuildCard key={guild.guild_id} guild={guild} onConfigureRegion={() => setConfiguringRegionGuild(guild)} />

            ))}

          </div>

        )}

      </main>



      {configuringRegionGuild && (
        <ServerRegionModal
          guild={configuringRegionGuild}
          onClose={() => setConfiguringRegionGuild(null)}
          onSuccess={() => { setConfiguringRegionGuild(null); mutate(); }}
        />
      )}

    </div>

  );

}

