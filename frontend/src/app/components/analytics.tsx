import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import {
  AlertOctagon,
  Droplets,
  Percent,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, KPICard } from "./DeepDiveLayout";
import { DataTable } from "./DataTable";
import { Badge } from "./ui/badge";
import { getAnalyticsRaw, AnalyticsRow } from "../lib/api";
import { ENTER_DELAY_S, ENTER_STAGGER_S, CONTENT_DURATION_S } from "./SceneStage";

type AnalyticsProps = {
  onRowClick?: (surveyId: number) => void;
  /** Injected by SceneStage — true only while this scene is on stage. Drives
   *  the page-wide rise-from-the-field entrance (and, via inherited variants,
   *  every <Card>/<KPICard> nested anywhere inside). */
  sceneActive?: boolean;
};

const EASE_ENTER = [0.45, 0, 0.55, 1] as const; // matches the background camera's own easing
// Page-level stagger conduit + header rise — see DeepDiveLayout.tsx for the
// same pattern. Nested <Card>/<KPICard> instances elsewhere in this page
// already carry the matching "hidden"/"visible" item variants (traveling
// the same CONTENT_DURATION_S as the camera), so they inherit and animate
// correctly without any further wiring here.
const pageStaggerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: ENTER_STAGGER_S, delayChildren: ENTER_DELAY_S } },
};
const sectionRiseVariants = {
  hidden: { opacity: 0, y: 20, z: -160, scale: 0.93, filter: "blur(9px)" },
  visible: {
    opacity: 1, y: 0, z: 0, scale: 1, filter: "blur(0px)",
    transition: {
      default: { duration: CONTENT_DURATION_S, ease: EASE_ENTER },
      filter: { duration: CONTENT_DURATION_S * 0.35, ease: EASE_ENTER },
      opacity: { duration: 0.4, delay: CONTENT_DURATION_S - 0.45 },
    },
  },
};

type VillageRanking = {
  name: string;
  averageYield: number;
  averageNitrogen: number;
  efficiency: number;
  farmCount: number;
};

const theme = {
  green: "#52B788",
  darkGreen: "#2D6A4F",
  lightGreen: "#95D5B2",
  amber: "#C8973A",
  coral: "#D4624A",
  sky: "#3B82B8",
  slate: "#445566",
};

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function StatCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // once:false — this card's scene is display:none whenever it isn't active,
  // so this naturally re-fires the reveal every time the user returns.
  const inView = useInView(ref, { once: false, margin: "-30px" });

  return (
    <motion.div
      ref={ref}
      className="glass-card glass-reflect rounded-2xl p-5 relative overflow-hidden cursor-pointer card-premium"
      initial={{ opacity: 0, y: 16, scale: 0.97, filter: "blur(8px)" }}
      animate={inView ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, scale: 1.02, boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(82,183,136,0.22)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/[0.02] pointer-events-none" />
      {/* Color accent glow */}
      <div
        className="absolute -bottom-5 -right-5 w-20 h-20 rounded-full pointer-events-none opacity-28"
        style={{ background: color, filter: "blur(20px)" }}
      />
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${color}40 50%, transparent 100%)` }}
      />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            className="p-2 rounded-xl backdrop-blur-md border border-white/10"
            style={{ background: `${color}18`, color }}
            whileHover={{ rotate: 8, scale: 1.12 }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
        </div>
        <p className="text-2xl font-bold font-outfit text-white drop-shadow-md">{value}</p>
        <p className="text-xs text-white/70 mt-1 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-white/45 font-medium mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function AdvancedAnalyticsPage({ onRowClick, sceneActive = true }: AnalyticsProps) {
  const [rows, setRows] = useState<AnalyticsRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAnalyticsRaw()
      .then(d => { if (!cancelled) setRows(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); });
    return () => { cancelled = true; };
  }, []);

  const analytics = useMemo(() => {
    const data = rows || [];
    const validRows = data.filter((row) => (row.yield || 0) > 0 && (row.n || 0) > 0);
    const villageMap: Record<string, { name: string; yieldSum: number; nitrogenSum: number; count: number }> = {};
    const quadrant = {
      target: [] as AnalyticsRow[],
      excessive: [] as AnalyticsRow[],
      underfertilized: [] as AnalyticsRow[],
      critical: [] as AnalyticsRow[],
    };

    let acreageSum = 0;
    let yieldSum = 0;
    let nitrogenSum = 0;

    data.forEach((row) => {
      acreageSum += row.acres || 0;
      yieldSum += row.yield || 0;
      nitrogenSum += row.n || 0;

      const village = row.village || "Unknown";
      if (!villageMap[village]) {
        villageMap[village] = { name: village, yieldSum: 0, nitrogenSum: 0, count: 0 };
      }
      villageMap[village].yieldSum += row.yield || 0;
      villageMap[village].nitrogenSum += row.n || 0;
      villageMap[village].count += 1;

      if ((row.yield || 0) >= 115) {
        if ((row.n || 0) < 380) quadrant.target.push(row);
        else quadrant.excessive.push(row);
      } else if ((row.n || 0) < 380) quadrant.underfertilized.push(row);
      else quadrant.critical.push(row);
    });

    const villageRankings: VillageRanking[] = Object.values(villageMap)
      .map((entry) => {
        const averageYield = entry.yieldSum / entry.count;
        const averageNitrogen = entry.nitrogenSum / entry.count;
        return {
          name: entry.name,
          averageYield: round(averageYield, 2),
          averageNitrogen: round(averageNitrogen, 2),
          efficiency: averageNitrogen > 0 ? round(averageYield / averageNitrogen, 4) : 0,
          farmCount: entry.count,
        };
      })
      .sort((a, b) => b.averageYield - a.averageYield);

    const scatterData = validRows.map((row) => ({
      x: row.n,
      y: row.yield,
      name: row.name,
      code: row.id,
      village: row.village,
    }));

    const topFarmers = [...validRows].sort((a, b) => (b.yield || 0) - (a.yield || 0)).slice(0, 5);
    const outliers = [...quadrant.critical].sort((a, b) => (b.n || 0) - (a.n || 0)).slice(0, 5);

    return {
      acreageSum,
      yieldSum,
      nitrogenSum,
      villageRankings,
      scatterData,
      topFarmers,
      outliers,
      quadrant,
    };
  }, [rows]);

  if (error) return <div className="p-8 text-red-400">{error}</div>;

  return (
    <motion.div
      className="p-4 md:p-8 max-w-[1400px] mx-auto w-full pt-20 lg:pt-8 space-y-8"
      variants={pageStaggerVariants}
      initial="hidden"
      animate={sceneActive ? "visible" : "hidden"}
    >
      <motion.header className="space-y-3 on-video-text" variants={sectionRiseVariants} style={{ transformPerspective: 1000 }}>
        <h1 className="text-3xl font-bold font-outfit text-white">
          Advanced Agronomic Analytics
        </h1>
        <p className="text-white/50 text-sm max-w-3xl">
          A dashboard-native analytics view for village performance, nitrogen efficiency, and critical outliers.
        </p>
      </motion.header>

      <section className="grid grid-cols-1 gap-6">
        <Card title="Agronomic Segment Split">
          <div className="space-y-4 text-xs text-white/80">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-[#223229] border border-[#2f4a3d] rounded-2xl flex flex-col justify-between" style={{ boxShadow: "0 0 16px rgba(149,213,178,0.10), inset 0 0 10px rgba(149,213,178,0.05)" }}>
                <div>
                  <Badge className="text-[8px] uppercase tracking-wider bg-[#95D5B2]/15 text-[#95D5B2] border-[#95D5B2]/20">Efficient Target</Badge>
                  <span className="block text-[10px] text-white/50 mt-1.5 leading-tight">High Yield, Low Nitrogen</span>
                </div>
                <strong className="block text-xl text-[#95D5B2] mt-3">{analytics.quadrant.target.length} Farms</strong>
              </div>
              <div className="p-3.5 bg-[#30261b] border border-[#5d4a2a] rounded-2xl flex flex-col justify-between" style={{ boxShadow: "0 0 16px rgba(230,193,106,0.10), inset 0 0 10px rgba(230,193,106,0.05)" }}>
                <div>
                  <Badge className="text-[8px] uppercase tracking-wider bg-[#C8973A]/15 text-[#E4C06A] border-[#C8973A]/20">Excessive N</Badge>
                  <span className="block text-[10px] text-white/50 mt-1.5 leading-tight">High Yield, High Nitrogen</span>
                </div>
                <strong className="block text-xl text-[#E4C06A] mt-3">{analytics.quadrant.excessive.length} Farms</strong>
              </div>
              <div className="p-3.5 bg-[#1d2420] border border-[#31403a] rounded-2xl flex flex-col justify-between" style={{ boxShadow: "0 0 14px rgba(255,255,255,0.05), inset 0 0 10px rgba(255,255,255,0.03)" }}>
                <div>
                  <Badge variant="outline" className="text-[8px] uppercase tracking-wider border-white/10 text-white/70">Under-fertilized</Badge>
                  <span className="block text-[10px] text-white/50 mt-1.5 leading-tight">Low Yield, Low Nitrogen</span>
                </div>
                <strong className="block text-xl text-white/80 mt-3">{analytics.quadrant.underfertilized.length} Farms</strong>
              </div>
              <div className="p-3.5 bg-[#331f22] border border-[#5a2b31] rounded-2xl flex flex-col justify-between" style={{ boxShadow: "0 0 16px rgba(242,139,130,0.10), inset 0 0 10px rgba(242,139,130,0.05)" }}>
                <div>
                  <Badge variant="destructive" className="text-[8px] uppercase tracking-wider">Critical Outliers</Badge>
                  <span className="block text-[10px] text-white/50 mt-1.5 leading-tight">Low Yield, High Nitrogen</span>
                </div>
                <strong className="block text-xl text-[#F28B82] mt-3">{analytics.quadrant.critical.length} Farms</strong>
              </div>
            </div>

            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 mt-2">
              <span className="font-bold flex items-center gap-1.5 text-white/90">
                <Sparkles className="w-3.5 h-3.5 text-[#95D5B2]" />
                EDF Agronomic Recommendation
              </span>
              <p className="text-[11px] text-white/60 mt-1.5 leading-relaxed">
                Prioritize training intervention for the {analytics.quadrant.critical.length} critical outlier farms where nitrogen application is high but crop yields remain depressed.
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Village Yield Rankings Leaderboard">
          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-white/5 text-white/50 uppercase tracking-wider font-bold border-b border-white/10 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-2 text-center">Rank</th>
                  <th className="py-2.5 px-2">Village</th>
                  <th className="py-2.5 px-2 text-right">Avg Yield</th>
                  <th className="py-2.5 px-2 text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {analytics.villageRankings.map((village, index) => (
                  <tr key={village.name} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-2 text-center font-bold text-white/80">{index + 1}</td>
                    <td className="py-2.5 px-2 font-bold text-white/90 truncate max-w-[85px]" title={village.name}>{village.name}</td>
                    <td className="py-2.5 px-2 text-right font-semibold text-white/90">{village.averageYield} t/ha</td>
                    <td className="py-2.5 px-2 text-right">
                      <Badge variant={village.efficiency >= 0.3 ? "secondary" : village.efficiency >= 0.2 ? "outline" : "destructive"} className="text-[9px] px-1.5 py-0.5">
                        {village.efficiency.toFixed(3)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="High Productivity Farmers">
          <div className="space-y-3 text-xs max-h-[360px] overflow-y-auto pr-1">
            {analytics.topFarmers.map((farmer, index) => (
              <div key={farmer.id} className="rank-row rank-row-positive flex items-center justify-between p-3 rounded-2xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-extrabold text-sm text-white/50 w-4 text-center shrink-0">#{index + 1}</span>
                  <div className="min-w-0">
                    <span className="font-bold text-white/90 block truncate">{farmer.name}</span>
                    <span className="text-[10px] text-white/50 font-mono block truncate">{farmer.id} ({farmer.village})</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <strong className="block text-sm text-white/90">{farmer.yield.toFixed(1)} t/ha</strong>
                  <span className="text-[9px] text-[#95D5B2] block mt-0.5">N: {farmer.n.toFixed(1)} kg/ha</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Critical Nitrogen Inefficiency Outliers">
          <div className="space-y-3 text-xs max-h-[360px] overflow-y-auto pr-1">
            {analytics.outliers.length > 0 ? (
              analytics.outliers.map((farmer) => (
                <button
                  key={farmer.id}
                  type="button"
                  onClick={() => onRowClick?.(farmer.surveyId)}
                  className="rank-row rank-row-critical w-full flex items-center justify-between p-3 rounded-2xl text-left"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-white/90 block truncate">{farmer.name}</span>
                    <span className="text-[10px] text-white/50 font-mono block truncate">{farmer.id} ({farmer.village})</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <strong className="block text-sm text-[#F28B82]">{farmer.n.toFixed(0)} kg N/ha</strong>
                    <span className="text-[9px] text-white/50 block mt-0.5">Yield: {farmer.yield.toFixed(1)} t/ha</span>
                  </div>
                </button>
              ))
            ) : (
              <span className="text-white/50 italic block text-center py-6">No outliers found in the current data subset.</span>
            )}
          </div>
        </Card>
      </section>
    </motion.div>
  );
}