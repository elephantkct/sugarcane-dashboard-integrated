import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polygon, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getFarmerLocations, FarmerLocation } from "../lib/api";

export function DistrictMap() {
  const [farmers, setFarmers] = useState<FarmerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFarmerLocations()
      .then((d) => {
        if (!cancelled) setFarmers(d);
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach the backend API for farmer locations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Generate a fixed color per block using the golden angle hue rotation
  const makeBlockColor = (idx: number) => {
    const hue = (idx * 137.508) % 360;
    return {
      color: `hsl(${hue}, 65%, 40%)`,
      fillColor: `hsl(${hue}, 55%, 45%)`,
    };
  };

  // Padded bounding box per block computed from farmer GPS points
  const blockPolygons = useMemo(() => {
    const byBlock: Record<string, FarmerLocation[]> = {};
    farmers.forEach((f) => {
      if (!f.block) return;
      (byBlock[f.block] ||= []).push(f);
    });

    const entries = Object.entries(byBlock).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([blockName, pts], idx) => {
      const lats = pts.map((p) => p.lat);
      const lngs = pts.map((p) => p.lng);
      const pad = 0.02;
      const minLat = Math.min(...lats) - pad;
      const maxLat = Math.max(...lats) + pad;
      const minLng = Math.min(...lngs) - pad;
      const maxLng = Math.max(...lngs) + pad;
      const palette = makeBlockColor(idx);

      return {
        id: blockName,
        ...palette,
        positions: [
          [maxLat, minLng],
          [maxLat, maxLng],
          [minLat, maxLng],
          [minLat, minLng],
        ] as [number, number][],
        farmerCount: pts.length,
      };
    });
  }, [farmers]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#F7F9F7] text-[#6E7C6E] text-xs font-medium rounded-[16px]">
        Loading district GIS map & farmer locations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-rose-50 text-rose-600 text-xs font-medium rounded-[16px] border border-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div className="card-hover relative w-full h-full rounded-[16px] overflow-hidden border border-[#E8EFE8]">
      <MapContainer
        center={[11.38, 77.64]}
        zoom={11}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", background: "#F7F9F7" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Dynamic Leaflet CSS rules for block label borders */}
        <style>
          {blockPolygons
            .map(
              (b) =>
                `.block-label-${b.id.replace(/\s+/g, "-")} { border-color: ${b.color} !important; color: ${b.color} !important; font-weight: 700; }`
            )
            .join("\n")}
        </style>

        {/* Block boundaries */}
        {blockPolygons.map((block) => (
          <Polygon
            key={block.id}
            positions={block.positions}
            pathOptions={{
              color: block.color,
              fillColor: block.fillColor,
              fillOpacity: 0.1,
              weight: 1.5,
              dashArray: "5, 5",
            }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -8]}
              opacity={0.95}
              className={`block-label-tooltip block-label-${block.id.replace(/\s+/g, "-")}`}
            >
              <span className="font-sans text-xs">
                {block.id} Block ({block.farmerCount})
              </span>
            </Tooltip>
            <Popup className="custom-leaflet-popup">
              <div className="p-1">
                <h3 className="font-semibold text-[#1F2A1F] text-xs m-0 leading-tight" style={{ color: block.color }}>
                  {block.id} Block
                </h3>
                <div className="flex items-center gap-2 border-t border-[#E8EFE8] pt-1.5 mt-1.5 text-xs">
                  <span className="text-[#6E7C6E]">Farmers Surveyed:</span>
                  <span className="font-bold text-[#2E7D32] bg-[#EDF6ED] px-2 py-0.5 rounded-full">
                    {block.farmerCount}
                  </span>
                </div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Individual farmer GPS markers */}
        {farmers.map((f) => (
          <CircleMarker
            key={f.surveyId}
            center={[f.lat, f.lng]}
            radius={5}
            pathOptions={{
              color: "#2E7D32",
              fillColor: "#4CAF50",
              fillOpacity: 0.9,
              weight: 1.5,
            }}
          >
            <Popup className="custom-leaflet-popup">
              <div className="p-1 text-xs">
                <h3 className="font-semibold text-[#1F2A1F] text-xs m-0 leading-tight">{f.name}</h3>
                <div className="text-[#6E7C6E] text-[10px] mb-1.5 font-medium uppercase tracking-wider">
                  {f.village} &middot; {f.block} Block
                </div>
                <div className="flex items-center gap-2 border-t border-[#E8EFE8] pt-1.5 mt-1">
                  <span className="text-[#6E7C6E]">Yield:</span>
                  <span className="font-bold text-[#2E7D32] bg-[#EDF6ED] px-2 py-0.5 rounded-full border border-[#A5D6A7]/40">
                    {f.yield ? `${f.yield} t/ha` : "—"}
                  </span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
