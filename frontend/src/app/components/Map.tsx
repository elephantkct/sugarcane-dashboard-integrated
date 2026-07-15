import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polygon, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getFarmerLocations, FarmerLocation } from "../lib/api";

type Tab = "Density";

export function DistrictMap() {
  const [activeTab, setActiveTab] = useState<Tab>("Density");
  const [farmers, setFarmers] = useState<FarmerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFarmerLocations()
      .then(d => { if (!cancelled) setFarmers(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Generate a color per block using the "golden angle" (137.508°) hue rotation.
  // Unlike spacing hues evenly across the current total (which reshuffles every
  // block's color the moment a new block appears), each block's color here only
  // depends on its own fixed position, so existing blocks keep the same color
  // over time and any newly-added block just gets the next well-separated hue.
  const makeBlockColor = (idx: number) => {
    const hue = (idx * 137.508) % 360;
    return {
      color: `hsl(${hue}, 70%, 60%)`,
      fillColor: `hsl(${hue}, 55%, 22%)`,
    };
  };

  // A padded bounding box per block, computed directly from the real farmer GPS
  // points — so every block that exists in the data gets its own labeled box,
  // no matter how the dataset changes in the future.
  const blockPolygons = useMemo(() => {
    const byBlock: Record<string, FarmerLocation[]> = {};
    farmers.forEach(f => {
      if (!f.block) return;
      (byBlock[f.block] ||= []).push(f);
    });

    const entries = Object.entries(byBlock).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([blockName, pts], idx) => {
      const lats = pts.map(p => p.lat);
      const lngs = pts.map(p => p.lng);
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
          [maxLat, minLng], [maxLat, maxLng], [minLat, maxLng], [minLat, minLng],
        ] as [number, number][],
        farmerCount: pts.length,
      };
    });
  }, [farmers]);

  const stats = useMemo(() => {
    const villages = new Set(farmers.map(f => f.village));
    const blocks = new Set(farmers.map(f => f.block));
    return {
      totalVillages: villages.size,
      totalBlocks: blocks.size,
      totalFarmers: farmers.length,
    };
  }, [farmers]);

  return (
    <div className="flex flex-col max-w-[1400px] mx-auto p-4 md:p-8 w-full h-full pt-20 lg:pt-8">
      <div className="flex justify-between items-end w-full mb-8 on-video-text">
        <div>
          <h2 className="text-3xl font-bold font-outfit text-transparent bg-clip-text bg-gradient-to-r from-white to-[#95D5B2]">
            Erode District Maps
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Real GPS locations of {stats.totalFarmers} surveyed farmers across {stats.totalVillages} villages and {stats.totalBlocks} blocks.
          </p>
        </div>
      </div>

      {loading && <div className="text-white/60 mb-4">Loading farmer locations...</div>}
      {error && <div className="text-red-400 mb-4">{error}</div>}

      <div
        className="glass-card glass-reflect card-premium relative w-full h-[600px] rounded-3xl overflow-hidden map-earthy-tiles"
        style={{ boxShadow: 'var(--glass-shadow)' }}
      >
        <MapContainer
          center={[11.38, 77.64]}
          zoom={11}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#080d0a' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {/* One boundary box per block, always visible, with the block name
              permanently labeled above it for easy identification */}
          {/* Per-block border colors for the label pills — Leaflet tooltips don't
              accept inline style directly, so we inject scoped CSS per block id. */}
          <style>
            {blockPolygons.map(b => `.block-label-${b.id.replace(/\s+/g, "-")} { border-color: ${b.color} !important; }`).join("\n")}
          </style>

          {blockPolygons.map(block => (
            <Polygon
              key={block.id}
              positions={block.positions}
              pathOptions={{
                color: block.color,
                fillColor: block.fillColor,
                fillOpacity: 0.18,
                weight: 1.5,
                dashArray: "6, 8",
                className: "glowing-boundary"
              }}
            >
              <Tooltip
                permanent
                direction="top"
                offset={[0, -10]}
                opacity={1}
                className={`block-label-tooltip block-label-${block.id.replace(/\s+/g, "-")}`}
              >
                <span
                  className="font-bold font-outfit"
                  style={{ color: block.color }}
                >
                  {block.id} &middot; {block.farmerCount}
                </span>
              </Tooltip>
              <Popup className="custom-leaflet-popup">
                <div className="px-1">
                  <h3 className="font-bold text-[#e8f0ea] text-sm m-0 leading-tight" style={{ color: block.color }}>
                    {block.id} Block
                  </h3>
                  <div className="flex items-center gap-2 border-t border-white/10 pt-2 mt-2">
                    <span className="text-xs text-[#b5d6bf]">Farmers Surveyed:</span>
                    <span className="font-bold text-[#95D5B2] text-sm bg-[#52B788]/20 px-2 py-0.5 rounded-full">
                      {block.farmerCount}
                    </span>
                  </div>
                </div>
              </Popup>
            </Polygon>
          ))}

          {/* Real per-farmer GPS markers */}
          {farmers.map(f => (
            <CircleMarker
              key={f.surveyId}
              center={[f.lat, f.lng]}
              radius={5}
              pathOptions={{
                color: "rgba(255, 255, 255, 0.4)",
                fillColor: "#95D5B2",
                fillOpacity: 0.9,
                weight: 1,
                className: "illuminated-marker"
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="px-1">
                  <h3 className="font-bold text-[#e8f0ea] text-sm m-0 leading-tight">{f.name}</h3>
                  <div className="text-[#7aad8a] text-[10px] mb-2 font-medium uppercase tracking-wider">
                    {f.village} &middot; {f.block} Block
                  </div>
                  <div className="flex items-center gap-2 border-t border-white/10 pt-2 mt-1">
                    <span className="text-xs text-[#b5d6bf]">Yield:</span>
                    <span className="font-bold text-[#95D5B2] text-sm bg-[#52B788]/20 px-2 py-0.5 rounded-full">
                      {f.yield ? `${f.yield} t/ha` : "—"}
                    </span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8">
        {[
          { label: "Total Villages", value: stats.totalVillages, color: "#52B788" },
          { label: "Total Blocks", value: stats.totalBlocks, color: "#C8973A" },
          { label: "Total Farmers Mapped", value: stats.totalFarmers, color: "#8A9A5B" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className="card-premium rounded-xl p-6 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${stat.color}15 0%, rgba(10, 18, 14, 0.20) 60%, ${stat.color}0A 100%)`,
              backdropFilter: "blur(16px) saturate(140%)",
              WebkitBackdropFilter: "blur(16px) saturate(140%)",
              border: `1px solid ${stat.color}70`,
              boxShadow: `0 0 22px ${stat.color}33, inset 0 0 12px ${stat.color}1A, 0 12px 40px rgba(0,0,0,0.5)`,
            }}
            whileHover={{
              y: -4,
              scale: 1.015,
              border: `1.5px solid ${stat.color}B0`,
              boxShadow: `0 0 30px ${stat.color}55, inset 0 0 16px ${stat.color}33, 0 16px 48px rgba(0,0,0,0.65)`
            }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full pointer-events-none opacity-[0.14]"
              style={{ background: stat.color, filter: "blur(22px)" }}
            />
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-white font-outfit">{stat.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
