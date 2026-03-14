"use client";

import { useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import type { AvalonPortal, PortalSize, Route, ZoneData } from "../types";
import { PORTAL_SIZE_COLOR, PORTAL_SIZE_LABEL } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────

function fmtSec(seconds: number): string {
  if (seconds <= 0) return "EXPIRED";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${p(m)}m` : `${p(m)}m ${p(s)}s`;
}

// ── Dagre layout ──────────────────────────────────────────────

const NODE_W = 120;
const NODE_H = 42;

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 120, edgesep: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
    };
  });
}

// ── Graph builder ─────────────────────────────────────────────

type RoutePair = { count: number; earliestExpiry: number | null };

// Zone conflict color → node bg / border
const ZONE_COLOR_STYLE: Record<string, { bg: string; border: string; minimap: string }> = {
  blue:   { bg: 'rgba(30,80,200,0.18)',  border: '#4499ff', minimap: '#4499ff' },
  yellow: { bg: 'rgba(150,110,0,0.20)',  border: '#FFD700', minimap: '#FFD700' },
  red:    { bg: 'rgba(150,30,30,0.20)',  border: '#FF4444', minimap: '#FF4444' },
  black:  { bg: 'rgba(8,8,8,0.55)',      border: '#555555', minimap: '#555555' },
};

function buildGraph(
  portals: AvalonPortal[],
  routes: Route[],
  avalonZoneSet: Set<string>,
  indexToName: Map<string, string>,
  zoneColorMap: Map<string, string>,
): { nodes: Node[]; edges: Edge[] } {
  const now = Date.now() / 1000;

  // ── Extract route-derived pairs ────────────────────────────
  const routePairs = new Map<string, RoutePair>();
  for (const route of routes) {
    const sorted = [...route.waypoints].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length - 1; i++) {
      const pairKey = [sorted[i].zoneName, sorted[i + 1].zoneName].sort().join("|");
      const expiresAt = sorted[i + 1].expiresAt;
      const timeLeft = expiresAt ? new Date(expiresAt).getTime() / 1000 - now : null;

      const existing = routePairs.get(pairKey);
      if (existing) {
        existing.count++;
        if (timeLeft !== null && (existing.earliestExpiry === null || timeLeft < existing.earliestExpiry)) {
          existing.earliestExpiry = timeLeft;
        }
      } else {
        routePairs.set(pairKey, { count: 1, earliestExpiry: timeLeft });
      }
    }
  }

  // ── Collect all unique zones ───────────────────────────────
  const zoneSet = new Set<string>();
  portals.forEach((p) => { zoneSet.add(p.conn1); zoneSet.add(p.conn2); });
  routePairs.forEach((_, key) => {
    const [a, b] = key.split("|");
    zoneSet.add(a);
    zoneSet.add(b);
  });

  // ── Build nodes ────────────────────────────────────────────
  const zoneList = Array.from(zoneSet);
  const total = zoneList.length;
  const radius = Math.max(200, total * 35);

  const nodes: Node[] = zoneList.map((name, i) => {
    const angle = (2 * Math.PI * i) / total - Math.PI / 2;
    const isAvalon = avalonZoneSet.has(name);
    const label = indexToName.get(name) ?? name;
    const zColor = zoneColorMap.get(label);
    const style = isAvalon
      ? { bg: 'rgba(255,179,71,0.15)', border: '#FFB347' }
      : zColor && ZONE_COLOR_STYLE[zColor]
        ? { bg: ZONE_COLOR_STYLE[zColor].bg, border: ZONE_COLOR_STYLE[zColor].border }
        : { bg: 'rgba(68,153,255,0.12)', border: '#4499ff' };
    return {
      id: name,
      position: {
        x: Math.cos(angle) * radius + radius + 80,
        y: Math.sin(angle) * radius + radius + 80,
      },
      data: { label },
      style: {
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        borderRadius: 8,
        color: "#ddd",
        fontSize: 11,
        fontWeight: 700,
        padding: "6px 10px",
        minWidth: 90,
        textAlign: "center" as const,
      },
    };
  });

  // ── Portal edges ────────────────────────────────────────────
  const portalPairKeys = new Set<string>();
  const portalEdges: Edge[] = portals.map((p) => {
    portalPairKeys.add([p.conn1, p.conn2].sort().join("|"));
    const timeLeft = p.size === 0 ? 999999 : p.timeLeft;
    const expired  = timeLeft <= 0;
    const urgent   = !expired && p.size !== 0 && timeLeft < 3600;
    const color    = expired ? "#444" : urgent ? "#ff4444" : PORTAL_SIZE_COLOR[p.size as PortalSize];
    const timeLabel = p.size === 0 ? "Royal" : expired ? "Expired" : fmtSec(timeLeft);
    const chargesLabel = p.charges != null ? ` · ${p.charges}⚡` : "";

    return {
      id: p.id,
      source: p.conn1,
      target: p.conn2,
      label: `${PORTAL_SIZE_LABEL[p.size as PortalSize]}${chargesLabel} · ${timeLabel}`,
      style: { stroke: color, strokeWidth: expired ? 1 : 2 },
      labelStyle: { fill: color, fontSize: 10, fontWeight: 700 },
      labelBgStyle: { fill: "rgba(13,13,13,0.85)", stroke: color, strokeWidth: 0.5 },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 4,
      animated: !expired && p.size !== 0 && urgent,
    };
  });

  // ── Route-derived edges (not covered by a portal) ────────────
  const routeEdges: Edge[] = [];
  routePairs.forEach((data, pairKey) => {
    if (portalPairKeys.has(pairKey)) return;
    const [conn1, conn2] = pairKey.split("|");
    const expired = data.earliestExpiry !== null && data.earliestExpiry <= 0;
    const timeLabel =
      data.earliestExpiry === null ? "no timer"
      : expired ? "Expired"
      : fmtSec(data.earliestExpiry);
    const routeLabel = data.count === 1 ? "1 route" : `${data.count} routes`;
    const color = expired ? "#333" : "#5E8A5E";

    routeEdges.push({
      id: `route-${pairKey}`,
      source: conn1,
      target: conn2,
      label: `${routeLabel} · ${timeLabel}`,
      style: { stroke: color, strokeWidth: 1.5, strokeDasharray: "6,3" },
      labelStyle: { fill: expired ? "#444" : "#6aaa6a", fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: "rgba(13,13,13,0.85)", stroke: color, strokeWidth: 0.5 },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 4,
      animated: false,
    });
  });

  return { nodes, edges: [...portalEdges, ...routeEdges] };
}

// ── Inner panel — has access to ReactFlow context ─────────────

function GraphControls({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const { setNodes, fitView } = useReactFlow();

  // Auto-apply dagre layout on mount
  useEffect(() => {
    setNodes(applyDagreLayout(nodes, edges));
    requestAnimationFrame(() => fitView({ padding: 0.2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Panel position="top-left" style={{ margin: "10px 0 0 10px" }}>
      <button
        onClick={() => {
          setNodes(applyDagreLayout(nodes, edges));
          requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
        }}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 8,
          background: "rgba(13,13,13,0.9)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#aaa", fontSize: 11, fontWeight: 700, cursor: "pointer",
          backdropFilter: "blur(8px)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.6)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#eee")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#aaa")}
        title="Auto-organizar grafo"
      >
        <span className="material-icons" style={{ fontSize: 14, lineHeight: 1 }}>auto_fix_high</span>
        Auto-organizar
      </button>
    </Panel>
  );
}

// ── Component ──────────────────────────────────────────────────

interface AvalonGraphProps {
  portals: AvalonPortal[];
  routes?: Route[];
  emptyText: string;
  zones?: ZoneData[];
}

type AvalonZone = { index: string; uniqueName: string };

export default function AvalonGraph({ portals, routes = [], emptyText, zones = [] }: AvalonGraphProps) {
  // Fetch static zone list for name lookup and avalon zone identification
  const { data: avalonZoneList = [] } = useSWR<AvalonZone[]>(
    `${API_BASE}/avalon-zones`,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
  );

  // Set containing both index ("TNL-001") and uniqueName ("Ouyos-Aoeuam")
  // so both old (TNL-xxx) and new (name) portals are styled correctly as orange
  const avalonZoneSet = useMemo(() => new Set([
    ...avalonZoneList.map((z) => z.index),
    ...avalonZoneList.map((z) => z.uniqueName),
  ]), [avalonZoneList]);

  // Map TNL-xxx → uniqueName for backward compat display
  const indexToName = useMemo(
    () => new Map(avalonZoneList.map((z) => [z.index, z.uniqueName])),
    [avalonZoneList],
  );

  // displayName → conflict color (from /zones endpoint)
  const zoneColorMap = useMemo(
    () => new Map(zones.filter((z) => z.color).map((z) => [z.displayName, z.color as string])),
    [zones],
  );

  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildGraph(portals, routes, avalonZoneSet, indexToName, zoneColorMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [portals, routes, avalonZoneSet, indexToName, zoneColorMap],
  );

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  const isEmpty = portals.length === 0 && routes.length === 0;

  if (isEmpty) {
    return (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12,
          background: "#0D0D0D", color: "#444",
        }}
      >
        <span className="material-icons" style={{ fontSize: 48, color: "#222" }}>hub</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{emptyText}</span>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "#0D0D0D" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode="dark"
        style={{ background: "#0D0D0D" }}
        defaultEdgeOptions={{ type: "default" }}
      >
        <GraphControls nodes={nodes} edges={edges} />
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#1a1a1a"
        />
        <Controls
          style={{
            background: "rgba(13,13,13,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
        <MiniMap
          style={{ background: "#111", border: "1px solid #1f1f1f" }}
          nodeColor={(n) => {
            if (avalonZoneSet.has(String(n.id))) return "#FFB347";
            const name = indexToName.get(String(n.id)) ?? String(n.id);
            const c = zoneColorMap.get(name);
            return c ? (ZONE_COLOR_STYLE[c]?.minimap ?? "#4499ff") : "#4499ff";
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
