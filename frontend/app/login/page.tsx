"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "../components/LanguageSwitcher";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

function LoginContent() {
  const t = useTranslations();
  const params   = useSearchParams();
  const error    = params.get("error");
  const next     = params.get("next") ?? params.get("redirect") ?? "";

  const guildId  = next.split("/map/")[1]?.split("/")[0] ?? "";
  const loginUrl = `${API_BASE}/auth/discord${guildId ? `?guild_id=${guildId}` : ""}`;

  return (
    <main style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 0%, rgba(88,101,242,0.12) 0%, #0a0a0f 55%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: 16,
    }}>
      {/* Subtle grid overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Language switcher top-right */}
      <div style={{ position: "fixed", top: 16, right: 20, zIndex: 10 }}>
        <LanguageSwitcher />
      </div>

      <div style={{
        position: "relative",
        width: "100%", maxWidth: 380,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: "40px 36px 36px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 32px 64px rgba(0,0,0,0.5), 0 0 80px rgba(88,101,242,0.06)",
        backdropFilter: "blur(12px)",
      }}>

        {/* Logo placeholder */}
        <div style={{
          width: 80, height: 80,
          background: "linear-gradient(135deg, rgba(88,101,242,0.3) 0%, rgba(88,101,242,0.08) 100%)",
          border: "1.5px solid rgba(88,101,242,0.4)",
          borderRadius: 22,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24,
          boxShadow: "0 0 32px rgba(88,101,242,0.2)",
        }}>
          <img
            src="/brand/icon.png"
            alt="Ultimate Tracker"
            width={46}
            height={46}
            style={{ display: "block" }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fallback = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "block";
            }}
          />
          <span style={{ display: "none", fontSize: 40, lineHeight: 1 }}>🧭</span>
        </div>

        {/* Title */}
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#f0f0f5", letterSpacing: -0.5 }}>
          {t('login.title')}
        </h1>

        {/* Subtitle */}
        <p style={{ margin: "8px 0 28px", fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.6 }}>
          {t('login.subtitle')}
        </p>

        {/* Error banner */}
        {error === "no_guild" && (
          <div style={{
            width: "100%", marginBottom: 20,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13, color: "#f87171",
            textAlign: "center", lineHeight: 1.5,
          }}>
            {t('login.error_no_guild')}
          </div>
        )}

        {/* Divider */}
        <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 24 }} />

        {/* Discord button */}
        <a
          href={loginUrl}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            width: "100%",
            background: "linear-gradient(135deg, #5865F2 0%, #4752c4 100%)",
            color: "#fff",
            fontWeight: 700, fontSize: 15,
            textDecoration: "none",
            borderRadius: 12,
            padding: "13px 20px",
            boxShadow: "0 4px 24px rgba(88,101,242,0.35), 0 1px 0 rgba(255,255,255,0.1) inset",
            transition: "filter 0.15s",
            letterSpacing: 0.2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.12)")}
          onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
        >
          {/* Discord SVG logo */}
          <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.12 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.12 12.69-11.43 12.69z" />
          </svg>
          {t('login.cta')}
        </a>

        {/* Footer note */}
        <p style={{ margin: "20px 0 0", fontSize: 11, color: "rgba(255,255,255,0.18)", textAlign: "center", lineHeight: 1.6 }}>
          {t('login.footer_note')}
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
