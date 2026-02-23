'use client';

type TimerItem = {
  id: string;
  objective: string;
  zoneName: string;
  zoneKey: string;
  zoneId: string | null;
  center: { x: number; y: number } | null;
  respawnAt: string;
  status: 'COUNTDOWN' | 'SPAWNED';
};

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function TimerSidebar({
  items,
  selectedId,
  onSelectMapped,
}: {
  items: TimerItem[];
  selectedId?: string;
  onSelectMapped: (item: TimerItem) => void;
}) {
  const mapped = items.filter(it => it.zoneId && it.center);
  const unmapped = items.filter(it => !it.zoneId || !it.center);

  // Opcional: agrupar mapeados por zona
  const mappedByZone = mapped.reduce<Record<string, TimerItem[]>>((acc, it) => {
    const key = it.zoneId as string;
    (acc[key] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 12, borderRight: '1px solid #333' }}>
      <h3 style={{ marginTop: 0 }}>Timers</h3>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Mapeados no mapa ({mapped.length})
        </div>

        {Object.entries(mappedByZone).map(([zoneId, zoneItems]) => (
          <div key={zoneId} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{zoneId}</div>

            {zoneItems.map(it => (
              <button
                key={it.id}
                onClick={() => onSelectMapped(it)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  marginBottom: 6,
                  borderRadius: 8,
                  border: selectedId === it.id ? '1px solid #888' : '1px solid #333',
                  background: selectedId === it.id ? '#1e1e1e' : 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600 }}>{it.objective}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {it.zoneName} • {formatTime(it.respawnAt)}
                </div>
              </button>
            ))}
          </div>
        ))}

        {mapped.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Nenhum item mapeado ainda.
          </div>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          ⚠️ Não mapeados ({unmapped.length})
        </div>

        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
          Esses nomes não correspondem a zonas reais do mapa (abreviações/typos).
        </div>

        {unmapped.map(it => (
          <div
            key={it.id}
            style={{
              padding: '8px 10px',
              marginBottom: 6,
              borderRadius: 8,
              border: '1px dashed #444',
              background: 'transparent',
            }}
          >
            <div style={{ fontWeight: 600 }}>{it.objective}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              “{it.zoneName}” • {formatTime(it.respawnAt)}
            </div>
            <div style={{ fontSize: 11, opacity: 0.65 }}>
              zoneKey: {it.zoneKey}
            </div>
          </div>
        ))}

        {unmapped.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Tudo mapeado ✅
          </div>
        )}
      </div>
    </div>
  );
}