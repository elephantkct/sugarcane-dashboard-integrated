import { useEffect, useMemo, useState } from "react";
import { DistrictMap } from "../components/Map";
import { getSummary, getVillageData, SummaryStats } from "../lib/api";
import { nf } from "./PageKit";

type VillageRow = { village: string; block: string; farmers: number; acres: number; yield: number; tna: number };

export function DistrictMapPage() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [villages, setVillages] = useState<VillageRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSummary(), getVillageData()])
      .then(([sum, vill]) => {
        if (cancelled) return;
        setSummary(sum);
        setVillages(vill as VillageRow[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const blockAcres = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of villages ?? []) {
      map.set(v.block, (map.get(v.block) ?? 0) + v.acres);
    }
    return Array.from(map.entries())
      .map(([block, acres]) => ({ block, acres }))
      .sort((a, b) => b.acres - a.acres);
  }, [villages]);

  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-semibold" style={{ color: "var(--ink)" }}>Erode District Maps</h1>
          <p className="text-[13px] mt-1 flex items-center gap-1.5" style={{ color: "var(--ink)", opacity: 0.6 }}>
            📍 Real GPS locations of {summary?.totalFarmers ?? "—"} surveyed farmers across {summary?.villageCount ?? "—"} villages and {summary?.blockCount ?? "—"} blocks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-pill">{today}</span>
          <button className="btn-export">Export</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Coverage panel */}
        <div className="glass-card-master p-4 order-2 lg:order-1">
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: "var(--ink)" }}>Coverage</h3>
          <div className="space-y-2.5">
            {blockAcres.map((b) => (
              <div key={b.block} className="flex items-center justify-between text-[12px]">
                <span style={{ color: "var(--ink)", opacity: 0.75 }}>{b.block}</span>
                <span className="table-cell-numeric font-medium" style={{ color: "var(--ink)" }}>{nf.format(Math.round(b.acres))} ac</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="glass-card-master relative overflow-hidden order-1 lg:order-2 lg:col-span-2 h-[560px]">
          <div className="absolute top-3 right-3 z-[500] flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: "var(--ink)", color: "#F5F7F2" }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--sage)" }} />
            LIVE · Field View
          </div>
          <DistrictMap />
        </div>

        {/* Stat tiles */}
        <div className="space-y-4 order-3">
          <div className="glass-card-master p-4">
            <div className="kpi-number" style={{ fontSize: 26 }}>{summary?.villageCount ?? 0}</div>
            <p className="text-[12px] mt-1" style={{ color: "var(--ink)", opacity: 0.55 }}>Total Villages</p>
          </div>
          <div className="glass-card-master p-4">
            <div className="kpi-number" style={{ fontSize: 26 }}>{summary?.blockCount ?? 0}</div>
            <p className="text-[12px] mt-1" style={{ color: "var(--ink)", opacity: 0.55 }}>Total Blocks</p>
          </div>
          <div className="glass-card-master p-4">
            <div className="kpi-number" style={{ fontSize: 26 }}>{nf.format(summary?.totalFarmers ?? 0)}</div>
            <p className="text-[12px] mt-1" style={{ color: "var(--ink)", opacity: 0.55 }}>Total Farmers Mapped</p>
          </div>
        </div>
      </div>
    </div>
  );
}
