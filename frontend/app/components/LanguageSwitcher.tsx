"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

const LOCALES = [
  { code: "pt-BR", label: "Português", country: "br" },
  { code: "en",    label: "English",   country: "gb" },
  { code: "es",    label: "Español",   country: "es" },
  { code: "zh",    label: "中文",      country: "cn" },
] as const;

function Flag({ country }: { country: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${country}.png`}
      width={22}
      height={15}
      alt={country}
      style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0 }}
    />
  );
}

export default function LanguageSwitcher() {
  const locale                        = useLocale();
  const router                        = useRouter();
  const [isPending, startTransition]  = useTransition();
  const [open, setOpen]               = useState(false);
  const ref                           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function switchLocale(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    setOpen(false);
    startTransition(() => router.refresh());
  }

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>

      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: open ? "rgba(88,101,242,0.15)" : "rgba(255,255,255,0.06)",
          border: open ? "1px solid rgba(88,101,242,0.4)" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          color: "#ccc",
          fontSize: 12, fontWeight: 600,
          padding: "5px 10px",
          cursor: "pointer",
          opacity: isPending ? 0.5 : 1,
          transition: "all 0.15s",
          whiteSpace: "nowrap",
        }}
      >
        <Flag country={current.country} />
        <span>{current.label}</span>
        <span style={{ fontSize: 9, color: "#555", marginLeft: 2 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 160,
            background: "#111116",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(0,0,0,0.65)",
            zIndex: 9999,
          }}
        >
          {LOCALES.map(({ code, label, country }) => {
            const active = locale === code;
            return (
              <button
                key={code}
                onClick={() => !active && switchLocale(code)}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 14px",
                  background: active ? "rgba(88,101,242,0.15)" : "transparent",
                  border: "none",
                  color: active ? "#a0a9ff" : "rgba(255,255,255,0.6)",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: active ? "default" : "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <Flag country={country} />
                <span style={{ flex: 1 }}>{label}</span>
                {active && (
                  <span style={{ fontSize: 11, color: "#5865F2" }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
