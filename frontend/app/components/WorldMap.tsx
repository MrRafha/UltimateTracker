'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import React from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { useEffect, useState } from 'react';
import type { Route } from '../types';

// ── Coordenadas de jogo → CRS.Simple (fórmula do widget oficial da wiki) ──
const ANGLE = -45 * (Math.PI / 180);

export function gameToMap(x: number, z: number): [number, number] {
  const mapX = (z * Math.cos(ANGLE) + x * Math.sin(ANGLE)) / 800 * 256 - 128;
  const mapY = (-z * Math.sin(ANGLE) + x * Math.cos(ANGLE)) / 800 * 256 + 128;
  return [mapY, mapX]; // Leaflet: [lat, lng] = [y, x]
}

const MAP_BOUNDS = new L.LatLngBounds(L.latLng(20, 0), L.latLng(-276, 256));
const INITIAL_CENTER = gameToMap(0, 0);

// ── CSS global para as animações ──
const PULSE_CSS = `
@keyframes ao-pulse {
  0%   { transform: scale(1);    opacity: 1;    }
  50%  { transform: scale(1.55); opacity: 0.65; }
  100% { transform: scale(1);    opacity: 1;    }
}
.ao-ping {
  display: flex; align-items: center; justify-content: center;
  animation: ao-pulse 1.8s ease-in-out infinite;
  filter: drop-shadow(0 0 6px currentColor);
  font-size: 22px; line-height: 1;
}
.ao-ping-sel {
  animation: ao-pulse 0.85s ease-in-out infinite;
  font-size: 30px;
}
.ao-label {
  font-size: 13px; font-weight: 800;
  color: #ffffff;
  text-shadow:
    -1px -1px 0 #000, 1px -1px 0 #000,
    -1px  1px 0 #000, 1px  1px 0 #000,
    0 2px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.9);
  white-space: nowrap; pointer-events: none; text-align: center; line-height: 1;
  letter-spacing: 0.3px;
  background: rgba(0,0,0,0.6);
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}
`;

// ── Tipos ──
type ZoneCenter = { x: number; y: number };
type Ping = { id: string; zoneId: string; label: string; objective: string; center: ZoneCenter };
export type ZoneData = { zoneId: string; displayName: string; center: ZoneCenter };

// ── Mapeamento objetivo → emoji + cor ──
function getObjectiveStyle(objective: string): { emoji: string; color: string } {
  const o = objective.toLowerCase();

  const getColor = (t: string) => {
    if (t.includes('dourado') || t.includes('dourada')) return '#FFD700';
    if (t.includes('azul'))                             return '#44AAFF';
    if (t.includes('roxo') || t.includes('roxa'))      return '#CC44FF';
    if (t.includes('verde'))                            return '#44FF88';
    return '#FFFFFF';
  };

  if (o.includes('vortex') || o.includes('vórtex'))         return { emoji: '🌀', color: getColor(o) };
  if (o.includes('orb') || o.includes('orbe'))              return { emoji: '🔮', color: getColor(o) };
  if (o.includes('madeira'))                                return { emoji: '🪵', color: '#C8860A' };
  if (o.includes('minério') || o.includes('minerio'))       return { emoji: '⛏️', color: '#AAAAAA' };
  if (o.includes('fibra') || o.includes('linho'))           return { emoji: '🌿', color: '#88DD44' };
  if (o.includes('couro') || o.includes('pelego'))          return { emoji: '🐂', color: '#DD7744' };
  if (o.includes('pedra') || o.includes('stone'))           return { emoji: '🪨', color: '#BBBBBB' };
  return { emoji: '⚠️', color: '#FF4444' };
}

function makePingIcon(objective: string, selected: boolean): L.DivIcon {
  const { emoji, color } = getObjectiveStyle(objective);
  const cls  = selected ? 'ao-ping ao-ping-sel' : 'ao-ping';
  const size = selected ? 40 : 30;
  const bg   = selected ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)';
  const bw   = selected ? '2.5px' : '2px';
  const glow = selected
    ? `0 0 14px ${color}, 0 0 5px ${color}`
    : `0 0 8px ${color}99`;
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" style="color:${color};width:${size}px;height:${size}px;background:${bg};border:${bw} solid ${color};border-radius:50%;box-shadow:${glow};">${emoji}</div>`,
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size / 2],
    tooltipAnchor: [0, -(size / 2 + 4)],
  });
}

function makeLabelIcon(name: string): L.DivIcon {
  // Use a wider iconSize to avoid clipping long names; anchor is centered horizontally
  // and negative-Y so the pill renders below the zone center (under the ping icon)
  const approxW = Math.max(80, name.length * 8);
  return L.divIcon({
    className: '',
    html: `<div class="ao-label">${name}</div>`,
    iconSize:   [approxW, 18],
    iconAnchor: [approxW / 2, -20],
  });
}

function makePortalIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.75);border:2.5px solid ${color};box-shadow:0 0 12px ${color}, 0 0 5px ${color};display:flex;align-items:center;justify-content:center;">
      <span class="material-icons" style="font-size:14px;color:${color};line-height:1;">trip_origin</span>
    </div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
    tooltipAnchor: [0, -18],
  });
}

function makeRestIcon(): L.DivIcon {
  const color = '#DDAA55';
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,0.75);border:2px solid ${color};box-shadow:0 0 8px ${color}99;display:flex;align-items:center;justify-content:center;">
      <span class="material-icons" style="font-size:14px;color:${color};line-height:1;">home</span>
    </div>`,
    iconSize:   [26, 26],
    iconAnchor: [13, 13],
    tooltipAnchor: [0, -17],
  });
}

// ── Zonas especiais fixas (portais + rests) ──
const PORTAL_ZONE_RULES: { matches: string[]; color: string; label: string }[] = [
  { matches: ['thetford',     'portal'], color: '#CC44FF', label: 'Thetford Portal'     },
  { matches: ['bridgewatch',  'portal'], color: '#FF8C00', label: 'Bridgewatch Portal'  },
  { matches: ['martlock',     'portal'], color: '#44AAFF', label: 'Martlock Portal'      },
  { matches: ['fort sterling','portal'], color: '#8e8e8e', label: 'Fort Sterling Portal' },
  { matches: ['lymhurst',     'portal'], color: '#44FF88', label: 'Lymhurst Portal'      },
];
const REST_ZONE_MATCHES = ["morgana\'s rest", "arthur\'s rest", "merlyn\'s rest", "merlin\'s rest", 'morgana rest', 'arthur rest', 'merlyn rest'];

function SpecialZoneMarkers({ zones }: { zones: ZoneData[] }) {
  if (zones.length === 0) return null;
  const portals: { zone: ZoneData; color: string; label: string }[] = [];
  const rests: ZoneData[] = [];

  for (const z of zones) {
    const dn = z.displayName.toLowerCase();
    const portalRule = PORTAL_ZONE_RULES.find(r => r.matches.every(m => dn.includes(m)));
    if (portalRule) { portals.push({ zone: z, color: portalRule.color, label: portalRule.label }); continue; }
    if (REST_ZONE_MATCHES.some(m => dn.includes(m))) { rests.push(z); }
  }

  return (
    <>
      {portals.map(({ zone: z, color, label }) => (
        <Marker key={`portal-${z.zoneId}`} position={[z.center.y, z.center.x]} icon={makePortalIcon(color)} zIndexOffset={500}>
          <Tooltip direction="top" offset={[0, -4]} opacity={0.95} permanent={false}>
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
          </Tooltip>
        </Marker>
      ))}
      {rests.map((z) => (
        <Marker key={`rest-${z.zoneId}`} position={[z.center.y, z.center.x]} icon={makeRestIcon()} zIndexOffset={400}>
          <Tooltip direction="top" offset={[0, -3]} opacity={0.95} permanent={false}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#DDAA55' }}>{z.displayName}</span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

// ── Sub-componentes ──
function InjectCSS() {
  useEffect(() => {
    if (document.getElementById('ao-map-css')) return;
    const el = document.createElement('style');
    el.id = 'ao-map-css';
    el.textContent = PULSE_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}

function FlyTo({ center }: { center?: ZoneCenter }) {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 0);
    if (!center) return;
    map.flyTo([center.y, center.x], 5, { duration: 0.6 });
  }, [center, map]);
  return null;
}

function ZoneLabels({ zones }: { zones: ZoneData[] }) {
  const [zoom, setZoom] = useState(2);
  useMapEvents({ zoomend: (e) => setZoom((e.target as L.Map).getZoom()) });

  // Só renderiza labels a partir do zoom 3 para não poluir visualmente
  if (zoom < 3 || zones.length === 0) return null;

  return (
    <>
      {zones.map((z) => (
        <Marker
          key={z.zoneId}
          position={[z.center.y, z.center.x]}
          icon={makeLabelIcon(z.displayName)}
          interactive={false}
          zIndexOffset={-1000}
        />
      ))}
    </>
  );
}

// ── Route Layer (polylines + anchor markers) ──
function routeSegmentColor(expiresAt: string | null, now: number): string {
  if (!expiresAt) return '#88aadd';
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0)           return '#555555';
  if (ms < 10 * 60_000)  return '#FF4444';
  if (ms < 60 * 60_000)  return '#FFD700';
  return '#44dd88';
}

function fmtMs(ms: number): string {
  if (ms <= 0) return 'EXPIRADO';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`;
}

function makeRouteAnchorIcon(role: 'entry' | 'exit' | 'transit'): L.DivIcon {
  const color = role === 'entry' ? '#44dd88' : role === 'exit' ? '#FF8C44' : '#88aadd';
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:6px;background:rgba(0,0,0,0.85);border:2px solid ${color};box-shadow:0 0 10px ${color}99;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:15px;color:${color};line-height:1;font-variation-settings:'FILL' 1,'wght' 600">gate</span></div>`,
    iconSize:      [26, 26],
    iconAnchor:    [13, 13],
    tooltipAnchor: [0, -16],
  });
}

function RouteLayer({ routes, onRouteClick }: { routes: Route[]; onRouteClick?: (routeId: string) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  if (routes.length === 0) return null;

  return (
    <>
      {routes.map((route) => {
        const allWps    = route.waypoints;
        const mappedWps = allWps.filter((w) => w.center !== null);

        return (
          <React.Fragment key={route.id}>
            {/* Anchor markers at every mapped waypoint */}
            {mappedWps.map((wp) => {
              const globalIdx = allWps.findIndex((w) => w.id === wp.id);
              const role = globalIdx === 0 ? 'entry'
                         : globalIdx === allWps.length - 1 ? 'exit'
                         : 'transit';
              const roleLabel = role === 'entry' ? 'Entrada' : role === 'exit' ? 'Saída' : 'Trânsito';
              const segColor  = routeSegmentColor(wp.expiresAt, now);
              const msLeft    = wp.expiresAt ? new Date(wp.expiresAt).getTime() - now : null;
              return (
                <Marker
                  key={`anchor-${route.id}-${wp.id}`}
                  position={[wp.center!.y, wp.center!.x]}
                  icon={makeRouteAnchorIcon(role)}
                  zIndexOffset={200}
                  eventHandlers={{ click: () => onRouteClick?.(route.id) }}
                >
                  <Tooltip direction="top" offset={[0, -14]} opacity={0.97}>
                    <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 800, fontSize: 12, color: role === 'entry' ? '#44dd88' : role === 'exit' ? '#FF8C44' : '#88aadd' }}>
                        {roleLabel}: {wp.zoneName}
                      </div>
                      {msLeft !== null && (
                        <div style={{ fontSize: 11, color: segColor, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtMs(msLeft)}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Clique para ver a rota completa</div>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

// ── Componente principal ──
export default function WorldMap({
  pings,
  zones = [],
  routes = [],
  selectedPingId,
  selectedCenter,
  onSelectPing,
  onRouteClick,
}: {
  pings: Ping[];
  zones?: ZoneData[];
  routes?: Route[];
  selectedPingId?: string;
  selectedCenter?: ZoneCenter;
  onSelectPing?: (id: string) => void;
  onRouteClick?: (routeId: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <MapContainer
      crs={L.CRS.Simple}
      center={INITIAL_CENTER}
      zoom={2}
      minZoom={1}
      maxZoom={7}
      maxBounds={MAP_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://wiki.albiononline.com/resources/assets/maptiles/{z}/map_{x}_{y}.png"
        tileSize={256}
        noWrap
        bounds={MAP_BOUNDS}
        maxZoom={7}
      />

      <InjectCSS />
      <FlyTo center={selectedCenter} />
      <ZoneLabels zones={zones} />
      <SpecialZoneMarkers zones={zones} />
      <RouteLayer routes={routes} onRouteClick={onRouteClick} />

      {pings.map((p) => (
        <Marker
          key={p.id}
          position={[p.center.y, p.center.x]}
          icon={makePingIcon(p.objective, selectedPingId === p.id)}
          zIndexOffset={selectedPingId === p.id ? 1000 : 0}
          eventHandlers={{ click: () => onSelectPing?.(p.id) }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.label}</span>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}