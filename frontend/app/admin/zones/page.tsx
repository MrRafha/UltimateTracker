'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type TimerItem = {
  zoneName: string;
  zoneKey: string;
  zoneId: string | null;
  center: { x: number; y: number } | null;
};

type ZoneRow = {
  zoneKey: string;
  zoneName: string;
  zoneId: string;
  center?: { x: number; y: number };
};

const AdminMap = dynamic(() => import('../../components/AdminMap'), { ssr: false });

export default function AdminZonesPage() {
  const { data } = useSWR('http://localhost:8000/timers', fetcher, {
    refreshInterval: 60_000,
  });

  // Agrupa por zoneKey (uma zona pode aparecer várias vezes)
  const zones: ZoneRow[] = useMemo(() => {
    const items: TimerItem[] = data?.items ?? [];
    const m = new Map<string, ZoneRow>();

    for (const it of items) {
      const zoneKey = it.zoneKey;
      const zoneId = it.zoneId ?? zoneKey.toUpperCase().replace(/\s+/g, '_'); // fallback
      if (!m.has(zoneKey)) {
        m.set(zoneKey, {
          zoneKey,
          zoneName: it.zoneName,
          zoneId,
          center: it.center ?? undefined,
        });
      }
    }
    return Array.from(m.values()).sort((a, b) => a.zoneName.localeCompare(b.zoneName));
  }, [data]);

  const [selected, setSelected] = useState<ZoneRow | null>(zones[0] ?? null);
  const [draftCenters, setDraftCenters] = useState<Record<string, { x: number; y: number }>>({});

  const selectedCenter = selected
    ? draftCenters[selected.zoneId] ?? selected.center
    : undefined;

  function onPickCenter(x: number, y: number) {
    if (!selected) return;
    setDraftCenters(prev => ({ ...prev, [selected.zoneId]: { x, y } }));
  }

  // Gera um JSON pronto para colar no backend/zones.json
  const exportZonesJson = useMemo(() => {
    const out: any[] = [];
    for (const z of zones) {
      const c = draftCenters[z.zoneId] ?? z.center;
      if (!c) continue;
      out.push({
        zoneId: z.zoneId,
        displayName: z.zoneName,
        center: c,
      });
    }
    return JSON.stringify(out, null, 2);
  }, [zones, draftCenters]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', height: '100vh' }}>
      <div style={{ padding: 12, borderRight: '1px solid #333', overflow: 'auto' }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>Admin: Centers</h2>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Selecione uma zona e clique no mapa para salvar center.</div>
        </div>

        <select
          style={{ width: '100%', padding: 8 }}
          value={selected?.zoneKey ?? ''}
          onChange={(e) => {
            const z = zones.find(x => x.zoneKey === e.target.value) ?? null;
            setSelected(z);
          }}
        >
          {zones.map(z => (
            <option key={z.zoneKey} value={z.zoneKey}>
              {z.zoneName} ({z.zoneId})
            </option>
          ))}
        </select>

        <div style={{ marginTop: 12, fontSize: 13 }}>
          <div><b>zoneKey:</b> {selected?.zoneKey ?? '-'}</div>
          <div><b>zoneId:</b> {selected?.zoneId ?? '-'}</div>
          <div>
            <b>center:</b>{' '}
            {selectedCenter ? `x=${Math.round(selectedCenter.x)}, y=${Math.round(selectedCenter.y)}` : '(não definido)'}
          </div>
        </div>

        <hr style={{ margin: '12px 0' }} />

        <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 6 }}>
          Cole isto em <code>backend/zones.json</code>:
        </div>
        <textarea
          readOnly
          value={exportZonesJson}
          style={{ width: '100%', height: 360, fontFamily: 'monospace', fontSize: 12 }}
        />
      </div>

      <div style={{ height: '100%' }}>
        <AdminMap selectedCenter={selectedCenter} onPickCenter={onPickCenter} />
      </div>
    </div>
  );
}
