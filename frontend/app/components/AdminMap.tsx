'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, useMapEvents, CircleMarker } from 'react-leaflet';

type Center = { x: number; y: number };

function ClickCapture({ onPick }: { onPick: (x: number, y: number) => void }) {
  useMapEvents({
    click(e) {
      // CRS.Simple: lat = y, lng = x
      onPick(e.latlng.lng, e.latlng.lat);
    },
  });
  return null;
}

// Mesmos bounds usados no WorldMap / widget oficial da wiki
const MAP_BOUNDS = new L.LatLngBounds(
  L.latLng(20, 0),
  L.latLng(-276, 256)
);

export default function AdminMap({
  selectedCenter,
  onPickCenter,
}: {
  selectedCenter?: Center;
  onPickCenter: (x: number, y: number) => void;
}) {
  return (
    <MapContainer
      // @ts-ignore crs é prop válida do Leaflet mas não tipada no react-leaflet v5
      crs={L.CRS.Simple}
      center={[-128, 128]}
      zoom={2}
      minZoom={1}
      maxZoom={7}
      maxBounds={MAP_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://wiki.albiononline.com/resources/assets/maptiles/{z}/map_{x}_{y}.png"
        // @ts-ignore
        tileSize={256}
        noWrap
        // @ts-ignore
        bounds={MAP_BOUNDS}
        maxZoom={7}
      />

      <ClickCapture onPick={onPickCenter} />

      {selectedCenter && (
        <CircleMarker
          center={[selectedCenter.y, selectedCenter.x]}
          // @ts-ignore
          radius={10}
          pathOptions={{ color: '#ff6b35', fillColor: '#ff6b35', fillOpacity: 0.9, weight: 2 }}
        />
      )}
    </MapContainer>
  );
}