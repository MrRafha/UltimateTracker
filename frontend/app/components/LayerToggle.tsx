"use client";

type MapMode = "world" | "avalon";

interface LayerToggleProps {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
  worldLabel: string;
  avalonLabel: string;
}

export default function LayerToggle({ mode, onChange, worldLabel, avalonLabel }: LayerToggleProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        right: 14,
        zIndex: 1000,
        display: "flex",
        background: "rgba(13,13,13,0.92)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: 3,
        gap: 2,
        boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
      }}
    >
      {(["world", "avalon"] as const).map((m) => {
        const active = mode === m;
        const label = m === "world" ? worldLabel : avalonLabel;
        const icon  = m === "world" ? "map" : "hub";
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            title={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              background: active ? "rgba(255,255,255,0.12)" : "transparent",
              color: active ? "#e8e8e8" : "#555",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = "#aaa";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = "#555";
            }}
          >
            <span
              className="material-icons"
              style={{ fontSize: 16, lineHeight: 1, color: active ? (m === "avalon" ? "#CC44FF" : "#88aadd") : "inherit" }}
            >
              {icon}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
