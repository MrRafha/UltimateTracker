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

export default function FloatingLangSwitcher() {
  const locale                       = useLocale();
  const router                       = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen]              = useState(false);
  const ref                          = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <style>{`
        @keyframes fls-popup-in {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        .fls-popup {
          animation: fls-popup-in 0.18s ease-out;
        }
        .fls-trigger {
          width: 50px; height: 50px;
          border-radius: 50%;
          background: #111111;
          border: 1px solid #1F1F1F;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: #8A8A8A;
          transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.15s;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }
        .fls-trigger:hover, .fls-trigger.open {
          background: rgba(88,101,242,0.15);
          border-color: rgba(88,101,242,0.5);
          color: #a0a8ff;
          transform: scale(1.07);
        }
        .fls-lang-btn {
          width: 100%;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.6);
          font-size: 13px; font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: background 0.1s, color 0.1s;
        }
        .fls-lang-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }
        .fls-lang-btn.active {
          background: rgba(88,101,242,0.12);
          color: #a0a9ff;
          font-weight: 700;
          cursor: default;
        }
      `}</style>

      <div
        ref={ref}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 1000,
          userSelect: "none",
        }}
      >
        {/* Popup de idiomas */}
        {open && (
          <div
            className="fls-popup"
            style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              right: 0,
              minWidth: 175,
              background: "#111111",
              border: "1px solid #1F1F1F",
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: "0 12px 40px rgba(0,0,0,0.65)",
              padding: "6px 0",
            }}
          >
            <div style={{
              padding: "8px 16px 6px",
              fontSize: 11,
              fontWeight: 700,
              color: "#444",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderBottom: "1px solid #1F1F1F",
              marginBottom: 4,
            }}>
              Language
            </div>
            {LOCALES.map(({ code, label, country }) => {
              const active = locale === code;
              return (
                <button
                  key={code}
                  onClick={() => !active && switchLocale(code)}
                  disabled={isPending}
                  className={`fls-lang-btn${active ? " active" : ""}`}
                >
                  <img
                    src={`https://flagcdn.com/w40/${country}.png`}
                    width={22}
                    height={15}
                    alt={country}
                    style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0 }}
                  />
                  <span style={{ flex: 1 }}>{label}</span>
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5865F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Botão flutuante */}
        <button
          className={`fls-trigger${open ? " open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-label="Change language"
          disabled={isPending}
        >
          {/* Globe SVG estilo wireframe/tech */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </button>
      </div>
    </>
  );
}
