"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { AvalonPortal, PortalSize, Route } from "../types";
import { PORTAL_SIZE_COLOR, PORTAL_SIZE_LABEL } from "../types";

// ── Helpers ───────────────────────────────────────────────────

function fmtSec(seconds: number): string {
  if (seconds <= 0) return "EXPIRED";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${p(m)}m` : `${p(m)}m ${p(s)}s`;
}

function isAvalonZone(name: string): boolean {
  return /^TNL-\d+$/i.test(name.trim());
}

// ── Graph builder ─────────────────────────────────────────────

type RoutePair = { count: number; earliestExpiry: number | null };

function buildGraph(
  portals: AvalonPortal[],
  routes: Route[],
  now: number,
): { nodes: Node[]; edges: Edge[] } {
  // ── 1. Extract route-derived pairs ─────────────────────────
  const routePairs = new Map<string, RoutePair>();

  for (const route of routes) {
    const sorted = [...route.waypoints].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i].zoneName;
      const b = sorted[i + 1].zoneName;
      const pairKey = [a, b].sort().join("|");
      // Time of this connection = expiresAt of the destination waypoint
      const expiresAt = sorted[i + 1].expiresAt;
      const timeLeft = expiresAt ? new Date(expiresAt).getTime() / 1000 - now : null;

      const existing = routePairs.get(pairKey);
      if (existing) {
        existing.count++;
        if (timeLeft !== null) {
          if (existing.earliestExpiry === null || timeLeft < existing.earliestExpiry) {
            existing.earliestExpiry = timeLeft;
          }
        }
      } else {
        routePairs.set(pairKey, { count: 1, earliestExpiry: timeLeft });
      }
    }
  }

  // ── 2. Collect all unique zones ────────────────────────────
  const zoneSet = new Set<string>();
  portals.forEach((p) => { zoneSet.add(p.conn1); zoneSet.add(p.conn2); });
  routePairs.forEach((_, key) => {
    const [a, b] = key.split("|");
    zoneSet.add(a);
    zoneSet.add(b);
  });

  // ── 3. Build nodes in a circle ────────────────────────────
  const zoneList = Array.from(zoneSet);
  const total = zoneList.length;
  const radius = Math.max(200, total * 35);

  const nodes: Node[] = zoneList.map((name, i) => {
    const angle = (2 * Math.PI * i) / total - Math.PI / 2;
    const isAvalon = isAvalonZone(name);
    return {
      id: name,
      position: {
        x: Math.cos(angle) * radius + radius + 80,
        y: Math.sin(angle) * radius + radius + 80,
      },
      data: { label: name },
      style: {
        background: isAvalon ? "rgba(255,179,71,0.15)" : "rgba(68,153,255,0.12)",
        border: `1.5px solid ${isAvalon ? "#FFB347" : "#4499ff"}`,
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

  // ── 4. Build portal edges ──────────────────────────────────
  const portalPairKeys = new Set<string>();
  const portalEdges: Edge[] = portals.map((p) => {
    portalPairKeys.add([p.conn1, p.conn2].sort().join("|"));
    const timeLeft = p.size === 0 ? 999999 : p.timeLeft;
    const expired  = timeLeft <= 0;
    const urgent   = !expired && p.size !== 0 && timeLeft < 3600;
    const color    = expired ? "#444" : urgent ? "#ff4444" : PORTAL_SIZE_COLOR[p.size as PortalSize];
    const labelText = p.size === 0 ? "Royal" : expired ? "Expired" : fmtSec(timeLeft);

    return {
      id: p.id,
      source: p.conn1,
      target: p.conn2,
      label: `${PORTAL_SIZE_LABEL[p.size as PortalSize]} · ${labelText}`,
      style: { stroke: color, strokeWidth: expired ? 1 : 2 },
      labelStyle: { fill: color, fontSize: 10, fontWeight: 700 },
      labelBgStyle: { fill: "rgba(13,13,13,0.85)", stroke: color, strokeWidth: 0.5 },
      labelBgPadding: [4, 6] as [number, number],
      labelBgBorderRadius: 4,
      animated: !expired && p.size !== 0 && urgent,
    };
  });

  // ── 5. Build route-derived edges (not covered by a portal) ─
  const routeEdges: Edge[] = [];
  routePairs.forEach((data, pairKey) => {
    if (portalPairKeys.has(pairKey)) return; // portal takes priority
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

// ── Component ──────────────────────────────────────────────────

interface AvalonGraphProps {
  portals: AvalonPortal[];
  routes?: Route[];
  emptyText: string;
}

export default function AvalonGraph({ portals, routes = [], emptyText }: AvalonGraphProps) {
  const now = Date.now() / 1000;
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildGraph(portals, routes, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [portals, routes],
  );

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  // Remount graph when portal or route set changes so new nodes are picked up
  const graphKey = [
    ...portals.map((p) => p.id),
    ...routes.map((r) => r.id),
  ].sort().join(",");

  const isEmpty = portals.length === 0 && routes.length === 0;

  if (isEmpty) {
    return (
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: 12,
          background: "#0D0D0D",
          color: "#444",
        }}
      >
        <span className="material-icons" style={{ fontSize: 48, color: "#222" }}>hub</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{emptyText}</span>
      </div>
    );
  }

  return (
    <div key={graphKey} style={{ width: "100%", height: "100%", background: "#0D0D0D" }}>
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
            const name = String(n.id);
            return isAvalonZone(name) ? "#FFB347" : "#4499ff";
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
