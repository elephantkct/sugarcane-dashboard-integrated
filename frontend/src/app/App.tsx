import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useInView } from "motion/react";
import { CinematicIntro } from "./components/CinematicIntro";
import { HeroTravelText, HeroTravelTextHandle } from "./components/HeroTravelText";
import ScrollDrivenBackground, {
  ScrollDrivenBackgroundHandle,
} from "./components/ScrollDrivenBackground";
import { TopNav, SECTIONS, SectionId } from "./components/TopNav";
import { SceneStage, SCENE_TRANSITION_SECONDS } from "./components/SceneStage";
import { Dashboard } from "./components/Dashboard";
import { DistrictMap } from "./components/Map";
import AdvancedAnalyticsPage from "./components/analytics";
import { DataTable } from "./components/DataTable";
import { FarmerProfile } from "./components/FarmerProfile";
import { DeepDiveLayout, Card, KPICard } from "./components/DeepDiveLayout";
import { getSummary, getYieldPageData, getIdentityPageData, getLandPageData, getFertilizerPageData, getRatoonPageData, getClimatePageData, getLongTailFertPageData, getLongTailOrgPageData } from "./lib/api";
import {
  BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend,
  ResponsiveContainer
} from "recharts";
import { Users, MapPin, TrendingUp, FlaskConical, Leaf, CloudSun, Target, Factory, Droplets } from "lucide-react";

const C = {
  g1: "#2D6A4F", g2: "#40916C", g3: "#52B788", g4: "#74C69D", g5: "#95D5B2",
  amber: "#C8973A", slate: "#445566", coral: "#D4624A", sky: "#3B82B8"
};
const COLORS = [C.g1, C.g3, C.amber, C.slate, C.g4, C.coral, C.sky, "#D4A373", "#A5A58D", "#6B705C"];
const nf = new Intl.NumberFormat("en-IN");

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border backdrop-blur-xl p-3 rounded-xl shadow-2xl text-xs"
      style={{
        background: 'rgba(12,20,15,0.88)',
        borderColor: 'rgba(82,183,136,0.18)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(82,183,136,0.12)'
      }}>
      {label && <p className="font-semibold mb-2 border-b pb-1" style={{ color: 'var(--foreground)', borderColor: 'rgba(82,183,136,0.15)' }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-3 justify-between mt-1">
          <span className="flex items-center gap-1.5" style={{ color: p.color || p.fill || 'var(--foreground)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill || 'var(--foreground)' }} />
            {p.name}
          </span>
          <strong style={{ color: 'var(--foreground)' }} className="ml-3">{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

// ── useChartAnimation: triggers recharts animations only when container is in view ──
function useChartAnimation(staggerBase = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    if (inView) setAnimKey(k => k + 1);
  }, [inView]);
  const barProps = {
    isAnimationActive: inView,
    animationBegin: staggerBase,
    animationDuration: 1050,
    animationEasing: "ease-out" as const,
  };
  const lineProps = {
    isAnimationActive: inView,
    animationBegin: staggerBase + 100,
    animationDuration: 1200,
    animationEasing: "ease-out" as const,
  };
  const pieProps = {
    isAnimationActive: inView,
    animationBegin: staggerBase,
    animationDuration: 900,
    animationEasing: "ease-out" as const,
  };
  const scatterProps = {
    isAnimationActive: inView,
    animationBegin: staggerBase,
    animationDuration: 1000,
    animationEasing: "ease-out" as const,
  };
  return { ref, inView, animKey, barProps, lineProps, pieProps, scatterProps };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-page Components
// ─────────────────────────────────────────────────────────────────────────────

type IdentityRecord = {
  surveyId: number; farmerCode: string; name: string; mobileNumber: string | null;
  collectionDate: string | null; employee: string | null; village: string; block: string;
};

function IdentityPage({ onRowClick }: { onRowClick: (surveyId: number) => void }) {
  const [data, setData] = useState<{
    totalFarmers: number; topVillage: string; topEdu: string;
    villageData: { name: string; value: number }[];
    ageData: { name: string; value: number }[];
    eduData: { name: string; Farmers: number; AvgYield: number }[];
    records: IdentityRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getIdentityPageData()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartA = useChartAnimation(0);
  const chartB = useChartAnimation(80);
  const chartC = useChartAnimation(0);

  if (loading) return <div className="p-8 text-white/60">Loading identity &amp; admin data...</div>;
  if (error || !data) return <div className="p-8 text-red-400">{error || "No data available."}</div>;

  return (
    <DeepDiveLayout
      title="Identity & Admin"
      charts={
        <>
          <Card title="Farmers by Village (Top 10)">
            <div className="h-48" ref={chartA.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={chartA.animKey} data={data.villageData} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                  <Bar dataKey="value" name="Farmers" fill="url(#barGradientGreen)" radius={[0, 4, 4, 0]} maxBarSize={20}
                    {...chartA.barProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Age Distribution">
            <div className="h-48" ref={chartB.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={chartB.animKey} data={data.ageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                  <Bar dataKey="value" name="Farmers" fill="url(#barGradientAmber)" radius={[4, 4, 0, 0]} maxBarSize={30}
                    {...chartB.barProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Education vs Average Yield (t/ha)">
            <div className="h-48" ref={chartC.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart key={chartC.animKey} data={data.eduData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                  <Bar yAxisId="left" dataKey="Farmers" fill="url(#barGradientGreen)" radius={[4, 4, 0, 0]} maxBarSize={40}
                    {...chartC.barProps}
                  />
                  <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke={C.amber} strokeWidth={2.5} style={{ filter: "url(#premium-glow)" }}
                    dot={{ r: 3.5, fill: C.amber, strokeWidth: 1.5, stroke: 'var(--card)' }} activeDot={{ r: 5 }}
                    {...chartC.lineProps}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      }
      kpis={
        <>
          <KPICard label="Total Farmers" value={data.totalFarmers} icon={<Users size={20} />} color={C.g1} />
          <KPICard label="Top Village" value={data.topVillage} icon={<MapPin size={20} />} color={C.amber} />
          <KPICard label="Most Common Education" value={data.topEdu} icon={<Target size={20} />} color={C.sky} />
        </>
      }
      table={
        <DataTable<IdentityRecord>
          title="Identity Records"
          data={data.records}
          searchFields={r => `${r.name} ${r.farmerCode}`}
          onRowClick={r => onRowClick(r.surveyId)}
          columns={[
            { header: "Farmer Code", accessor: r => <span className="font-mono text-xs">{r.farmerCode}</span> },
            { header: "Name", accessor: r => <span className="font-medium text-white">{r.name}</span> },
            { header: "Mobile Number", accessor: r => r.mobileNumber || "-" },
            { header: "Collection Date", accessor: r => r.collectionDate || "-" },
            { header: "Employee", accessor: r => r.employee || "-" },
            { header: "Village", accessor: r => r.village },
            { header: "Block", accessor: r => r.block },
          ]}
        />
      }
    />
  );
}

type LandRecord = { surveyId: number; name: string; village: string; largestPlotAcres: number | null; landAreaHa: number | null };

function LandPage({ onRowClick }: { onRowClick: (surveyId: number) => void }) {
  const [data, setData] = useState<{
    totalAcres: number; avgPlot: number; avgYield: number;
    yieldDistData: { name: string; value: number }[];
    yieldIrrData: { name: string; Farmers: number; TotalAcres: number; AvgYield: number }[];
    records: LandRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLandPageData()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartD = useChartAnimation(0);
  const chartE = useChartAnimation(80);

  if (loading) return <div className="p-8 text-white/60">Loading land detail data...</div>;
  if (error || !data) return <div className="p-8 text-red-400">{error || "No data available."}</div>;

  return (
    <DeepDiveLayout
      title="Land Details"
      charts={
        <>
          <Card title="Irrigation Method: Acreage vs Yield" className="lg:col-span-2">
            <div className="h-48" ref={chartD.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart key={chartD.animKey} data={data.yieldIrrData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar yAxisId="left" dataKey="TotalAcres" name="Total Acres" fill="url(#barGradientSky)" radius={[4, 4, 0, 0]} maxBarSize={40}
                    {...chartD.barProps}
                  />
                  <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke={C.g3} strokeWidth={2.5} style={{ filter: "url(#premium-glow)" }} dot={{ r: 3.5, fill: C.g3, strokeWidth: 1.5, stroke: "#121A15" }} activeDot={{ r: 5 }}
                    {...chartD.lineProps}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Yield Distribution (t/ha)">
            <div className="h-48" ref={chartE.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={chartE.animKey} data={data.yieldDistData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar dataKey="value" name="Farmers" fill="url(#barGradientGreen)" radius={[4, 4, 0, 0]} maxBarSize={30}
                    {...chartE.barProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      }
      kpis={
        <>
          <KPICard label="Total Acreage" value={`${nf.format(Math.round(data.totalAcres))} ac`} icon={<MapPin size={20} />} color={C.amber} />
          <KPICard label="Avg Plot Size" value={`${data.avgPlot} ac`} icon={<Factory size={20} />} color={C.sky} />
          <KPICard label="Avg Yield" value={`${data.avgYield} t/ha`} icon={<TrendingUp size={20} />} color={C.g3} />
        </>
      }
      table={
        <DataTable<LandRecord>
          title="Land Records"
          data={data.records}
          searchFields={r => `${r.name} ${r.village}`}
          onRowClick={r => onRowClick(r.surveyId)}
          columns={[
            { header: "Name", accessor: r => <span className="font-medium text-white">{r.name}</span> },
            { header: "Village", accessor: r => r.village },
            { header: "Size of Largest Plot (Acres)", align: "right", accessor: r => <span className="font-medium text-[#95D5B2]">{r.largestPlotAcres ?? '-'}</span> },
            { header: "Land Area (Ha)", align: "right", accessor: r => <span className="font-medium text-[#95D5B2]">{r.landAreaHa ?? '-'}</span> },
          ]}
        />
      }
    />
  );
}

type FertilizerRecord = { surveyId: number; name: string; village: string; method: string };

function FertilizerPage({ onRowClick }: { onRowClick: (surveyId: number) => void }) {
  const [data, setData] = useState<{
    fertData: { name: string; value: number }[];
    methData: { name: string; value: number }[];
    avgN: number;
    records: FertilizerRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFertilizerPageData()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartF = useChartAnimation(0);
  const chartG = useChartAnimation(80);

  if (loading) return <div className="p-8 text-white/60">Loading fertilizer method data...</div>;
  if (error || !data) return <div className="p-8 text-red-400">{error || "No data available."}</div>;

  return (
    <DeepDiveLayout
      title="Fertilizer Method"
      charts={
        <>
          <Card title="Top Core Fertilizers (Total Kg)">
            <div className="h-48" ref={chartF.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={chartF.animKey} data={data.fertData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar dataKey="value" name="Total Kg" fill="url(#barGradientCoral)" radius={[0, 4, 4, 0]} maxBarSize={20}
                    {...chartF.barProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Application Method Distribution" className="lg:col-span-2">
            <div className="h-48" ref={chartG.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={chartG.animKey} data={data.methData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar dataKey="value" name="Farmers" fill="url(#barGradientSlate)" radius={[4, 4, 0, 0]} maxBarSize={40}
                    {...chartG.barProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      }
      kpis={
        <>
          <KPICard label="Most Common Method" value={data.methData[0]?.name || "N/A"} icon={<Droplets size={20} />} color={C.sky} />
          <KPICard label="Avg Nitrogen" value={`${data.avgN} kg`} icon={<FlaskConical size={20} />} color={C.coral} />
          <KPICard label="Total Urea" value={`${nf.format(data.fertData.find(f => f.name === "Urea")?.value || 0)} kg`} icon={<Leaf size={20} />} color={C.g1} />
        </>
      }
      table={
        <DataTable<FertilizerRecord>
          title="Method Records"
          data={data.records}
          searchFields={r => `${r.name} ${r.method}`}
          onRowClick={r => onRowClick(r.surveyId)}
          columns={[
            { header: "Name", accessor: r => <span className="font-medium text-white">{r.name}</span> },
            { header: "Village", accessor: r => r.village },
            { header: "Method", accessor: r => <span className="bg-white/10 px-3 py-1 rounded-full text-xs">{r.method || 'Unknown'}</span> },
          ]}
        />
      }
    />
  );
}

type RatoonRecord = { surveyId: number; name: string; village: string; crop: string; wishNextRatoon: string };

function RatoonPage({ onRowClick }: { onRowClick: (surveyId: number) => void }) {
  const [data, setData] = useState<{
    rtData: { name: string; value: number }[];
    nextData: { name: string; Farmers: number; AvgYield: number }[];
    pctRatoon: number; pctNext: number;
    records: RatoonRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRatoonPageData()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartH = useChartAnimation(0);
  const chartI = useChartAnimation(80);

  if (loading) return <div className="p-8 text-white/60">Loading ratoon planning data...</div>;
  if (error || !data) return <div className="p-8 text-red-400">{error || "No data available."}</div>;

  return (
    <DeepDiveLayout
      title="Ratoon Planning"
      charts={
        <>
          <Card title="Plant Crop vs Ratoon Types" className="lg:col-span-2">
            <div className="h-48" ref={chartH.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={chartH.animKey} data={data.rtData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar dataKey="value" name="Farmers" fill="url(#barGradientSky)" radius={[4, 4, 0, 0]} maxBarSize={40}
                    {...chartH.barProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Intention for Next Ratoon vs Current Yield">
            <div className="h-48" ref={chartI.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart key={chartI.animKey} data={data.nextData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar yAxisId="left" dataKey="Farmers" fill="url(#barGradientGreen)" radius={[4, 4, 0, 0]} maxBarSize={40}
                    {...chartI.barProps}
                  />
                  <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke={C.coral} strokeWidth={2.5} style={{ filter: "url(#premium-glow)" }} dot={{ r: 3.5, fill: C.coral, strokeWidth: 1.5, stroke: "#121A15" }} activeDot={{ r: 5 }}
                    {...chartI.lineProps}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      }
      kpis={
        <>
          <KPICard label="% Current Ratoon" value={`${data.pctRatoon}%`} icon={<Leaf size={20} />} color={C.g1} />
          <KPICard label="% Planning Next Ratoon" value={`${data.pctNext}%`} icon={<TrendingUp size={20} />} color={C.sky} />
        </>
      }
      table={
        <DataTable<RatoonRecord>
          title="Ratoon Records"
          data={data.records}
          searchFields={r => `${r.name} ${r.village}`}
          onRowClick={r => onRowClick(r.surveyId)}
          columns={[
            { header: "Name", accessor: r => <span className="font-medium text-white">{r.name}</span> },
            { header: "Village", accessor: r => r.village },
            { header: "Current Crop", accessor: r => r.crop },
            { header: "Wish to go for next Ratoon?", accessor: r => {
                const ans = r.wishNextRatoon;
                return <span className={ans === 'Yes' ? 'text-[#52B788] font-medium' : 'text-white/60'}>{ans || '-'}</span>;
              } 
            },
          ]}
        />
      }
    />
  );
}

type ClimateRecord = { surveyId: number; name: string; village: string; severeEvents: string; growthStage: string };

function ClimatePage({ onRowClick }: { onRowClick: (surveyId: number) => void }) {
  const [data, setData] = useState<{
    evData: { name: string; value: number }[];
    stData: { name: string; value: number }[];
    pctNormal: number; topStress: string;
    records: ClimateRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClimatePageData()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartJ = useChartAnimation(0);
  const chartK = useChartAnimation(80);

  if (loading) return <div className="p-8 text-white/60">Loading climate detail data...</div>;
  if (error || !data) return <div className="p-8 text-red-400">{error || "No data available."}</div>;

  return (
    <DeepDiveLayout
      title="Climate Details"
      charts={
        <>
          <Card title="Severe Climate Events" className="lg:col-span-2">
            <div className="h-48" ref={chartJ.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={chartJ.animKey} data={data.evData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar dataKey="value" name="Reports" fill="url(#barGradientCoral)" radius={[4, 4, 0, 0]} maxBarSize={40}
                    {...chartJ.barProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Growth Stage Impacted">
            <div className="h-48" ref={chartK.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={chartK.animKey} data={data.stData} layout="vertical" margin={{ left: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar dataKey="value" name="Reports" fill="url(#barGradientGreen)" radius={[0, 4, 4, 0]} maxBarSize={20}
                    {...chartK.barProps}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      }
      kpis={
        <>
          <KPICard label="% Normal Year" value={`${data.pctNormal}%`} icon={<CloudSun size={20} />} color={C.sky} />
          <KPICard label="% Stressed Year" value={`${100 - data.pctNormal}%`} icon={<CloudSun size={20} />} color={C.amber} />
          <KPICard label="Top Stressor" value={data.topStress} icon={<TrendingUp size={20} />} color={C.coral} />
        </>
      }
      table={
        <DataTable<ClimateRecord>
          title="Climate Records"
          data={data.records}
          searchFields={r => `${r.name} ${r.severeEvents} ${r.growthStage}`}
          onRowClick={r => onRowClick(r.surveyId)}
          columns={[
            { header: "Name", accessor: r => <span className="font-medium text-white">{r.name}</span> },
            { header: "Village", accessor: r => r.village },
            { header: "Severe Climatic Events", accessor: r => <span className="text-[#D4624A] font-medium">{r.severeEvents || 'None'}</span> },
            { header: "Growth Stage Impacted", accessor: r => r.growthStage || '-' },
          ]}
        />
      }
    />
  );
}

function LongTailFertPage({ onRowClick }: { onRowClick: (surveyId: number) => void }) {
  const [data, setData] = useState<{
    chartData: { name: string; value: number }[];
    top: string;
    usingAny: number;
    records: Record<string, any>[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLongTailFertPageData()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartL = useChartAnimation(0);

  if (loading) return <div className="p-8 text-white/60">Loading long-tail fertilizer data...</div>;
  if (error || !data) return <div className="p-8 text-red-400">{error || "No data available."}</div>;

  return (
    <DeepDiveLayout
      title="Long-tail Fertilizers"
      charts={
        <Card title="Usage Frequency (Farmers Using)" className="lg:col-span-3">
          <div className="h-56" ref={chartL.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartL.animKey} data={data.chartData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} interval={0} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="value" name="Farmers" fill="url(#barGradientCoral)" radius={[4, 4, 0, 0]} maxBarSize={40}
                  {...chartL.barProps}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      }
      kpis={
        <>
          <KPICard label="Most Used Long-tail" value={data.top} icon={<FlaskConical size={20} />} color={C.coral} />
          <KPICard label="Farmers Using Long-tails" value={data.usingAny} icon={<Users size={20} />} color={C.slate} />
        </>
      }
      table={
        <DataTable<Record<string, any>>
          title="Fertilizer Usage Records (Kg)"
          data={data.records}
          searchFields={r => `${r.name}`}
          onRowClick={r => onRowClick(r.surveyId)}
          columns={[
            { header: "Name", accessor: r => <span className="font-medium text-white">{r.name}</span> },
            { header: "SSP", align: "right", accessor: r => r["SSP"] ?? '-' },
            { header: "NPK 10-26-26", align: "right", accessor: r => r["NPK 10-26-26"] ?? '-' },
            { header: "Amm. Sulphate", align: "right", accessor: r => r["Amm. Sulphate"] ?? '-' },
            { header: "NPK 17-17-17", align: "right", accessor: r => r["NPK 17-17-17"] ?? '-' },
            { header: "CAN", align: "right", accessor: r => r["CAN"] ?? '-' },
          ]}
        />
      }
    />
  );
}

function LongTailOrgPage({ onRowClick }: { onRowClick: (surveyId: number) => void }) {
  const [data, setData] = useState<{
    chartData: { name: string; value: number }[];
    top: string;
    vol: number;
    records: { surveyId: number; name: string; vermicompost: number | null; goatSheepManure: number | null; poultryManure: number | null; jeevamrut: number | null }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLongTailOrgPageData()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartM = useChartAnimation(0);

  if (loading) return <div className="p-8 text-white/60">Loading long-tail organics data...</div>;
  if (error || !data) return <div className="p-8 text-red-400">{error || "No data available."}</div>;

  return (
    <DeepDiveLayout
      title="Long-tail Organics"
      charts={
        <Card title="Usage Frequency (Farmers Using)" className="lg:col-span-3">
          <div className="h-56" ref={chartM.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartM.animKey} data={data.chartData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="value" name="Farmers" fill="url(#barGradientGreen)" radius={[4, 4, 0, 0]} maxBarSize={60}
                  {...chartM.barProps}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      }
      kpis={
        <>
          <KPICard label="Most Used Organic" value={data.top} icon={<Leaf size={20} />} color={C.g5} />
          <KPICard label="Total Organic Volume" value={`${nf.format(data.vol)} kg`} icon={<Factory size={20} />} color={C.amber} />
        </>
      }
      table={
        <DataTable<{ surveyId: number; name: string; vermicompost: number | null; goatSheepManure: number | null; poultryManure: number | null; jeevamrut: number | null }>
          title="Organic Usage Records (Kg)"
          data={data.records}
          searchFields={r => `${r.name}`}
          onRowClick={r => onRowClick(r.surveyId)}
          columns={[
            { header: "Name", accessor: r => <span className="font-medium text-white">{r.name}</span> },
            { header: "Vermicompost", align: "right", accessor: r => r.vermicompost ?? '-' },
            { header: "Goat/Sheep Manure", align: "right", accessor: r => r.goatSheepManure ?? '-' },
            { header: "Poultry Manure", align: "right", accessor: r => r.poultryManure ?? '-' },
            { header: "Jeevamrut", align: "right", accessor: r => r.jeevamrut ?? '-' },
          ]}
        />
      }
    />
  );
}

type YieldRecord = { surveyId: number; name: string; village: string; acres: number; yield: number; tna: number };

function YieldPage({ onRowClick }: { onRowClick: (surveyId: number) => void }) {
  const [data, setData] = useState<{
    avgYield: number; avgN: number; maxYield: number;
    comboData: { name: string; Farmers: number; AvgYield: number }[];
    scatterData: { acres: number; yield: number; name: string }[];
    records: YieldRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getYieldPageData()
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Could not reach the backend API."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartN = useChartAnimation(0);
  const chartO = useChartAnimation(80);

  if (loading) return <div className="p-8 text-white/60">Loading yield &amp; nutrition data...</div>;
  if (error || !data) return <div className="p-8 text-red-400">{error || "No data available."}</div>;

  return (
    <DeepDiveLayout
      title="Yield & Nutrition"
      charts={
        <>
          <Card title="Nitrogen Applied vs Average Yield (Combo)" className="lg:col-span-2">
            <div className="h-48" ref={chartN.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart key={chartN.animKey} data={data.comboData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'TNA (kg)', position: 'insideBottomRight', fill: 'var(--muted-foreground)', fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                  <Bar yAxisId="left" dataKey="Farmers" fill="url(#barGradientSky)" radius={[4, 4, 0, 0]} maxBarSize={40}
                    {...chartN.barProps}
                  />
                  <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke={C.g3} strokeWidth={2.5} style={{ filter: "url(#premium-glow)" }} dot={{ r: 3.5, fill: C.g3, strokeWidth: 1.5, stroke: "#121A15" }} activeDot={{ r: 5 }}
                    {...chartN.lineProps}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
          
          <Card title="Plot Size vs Yield (Scatter)">
            <div className="h-48" ref={chartO.ref}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart key={chartO.animKey} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="acres" name="Acres" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="yield" name="Yield (t/ha)" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <ReTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                  <Scatter name="Farmers" data={data.scatterData} fill={C.amber} opacity={0.7} style={{ filter: "url(#scatter-glow)" }}
                    {...chartO.scatterProps}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      }
      kpis={
        <>
          <KPICard label="Avg Yield" value={`${data.avgYield} t/ha`} icon={<TrendingUp size={20} />} color={C.g3} />
          <KPICard label="Avg TNA" value={`${data.avgN} kg`} icon={<FlaskConical size={20} />} color={C.sky} />
          <KPICard label="Max Yield Recorded" value={`${data.maxYield} t/ha`} icon={<Target size={20} />} color={C.amber} />
        </>
      }
      table={
        <DataTable<YieldRecord>
          title="Yield & Nutrition Records"
          data={data.records}
          searchFields={r => `${r.name} ${r.village}`}
          onRowClick={r => onRowClick(r.surveyId)}
          columns={[
            { header: "Name", accessor: r => <span className="font-medium text-white">{r.name}</span> },
            { header: "Village", accessor: r => r.village },
            { header: "Plot Size (Acres)", align: "right", accessor: r => <span className="font-medium text-[#95D5B2]">{r.acres}</span> },
            { header: "Yield (t/ha)", align: "right", accessor: r => <span className="font-bold text-[#52B788]">{r.yield || '-'}</span> },
            { header: "TNA (kg)", align: "right", accessor: r => <span className="font-bold text-[#3B82B8]">{r.tna || '-'}</span> },
          ]}
        />
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);

  // ── Theme — Dark is the permanent default ──
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.add("dark");
    try { localStorage.setItem("edf_theme", "dark"); } catch {}
  }, []);

  // ── Intro state ──
  const [introComplete, setIntroComplete] = useState<boolean>(() => {
    try { return sessionStorage.getItem("edf_intro_played") === "1"; }
    catch { return false; }
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  // Captures whether the intro was already played this session, at first
  // render only — distinguishes "skip straight to docked" from "just
  // finished a normal transition" (both eventually leave introComplete=true).
  const skipIntroRef = useRef(introComplete);

  const bgRef = useRef<ScrollDrivenBackgroundHandle>(null);
  const heroTextRef = useRef<HeroTravelTextHandle>(null);
  const heroDockTargetRef = useRef<HTMLDivElement | null>(null);

  const handleHeroReady = useCallback(() => {
    setHeroReady(true);
  }, []);

  const handleTransitionStart = useCallback(() => {
    setIsTransitioning(true);
    // Signal the background video to begin fading in
    bgRef.current?.beginReveal();
    // Send the hero text on its magic-move journey to the dashboard header
    heroTextRef.current?.startTravel();
  }, []);

  const handleIntroComplete = useCallback(() => {
    try { sessionStorage.setItem("edf_intro_played", "1"); } catch {}
    // The intro's skip gesture (wheel/touch/keydown) doesn't preventDefault, so the
    // window can end up scrolled past the top by the time the intro finishes. Snap
    // back to the top so the dashboard reveals under the nav bar instead of mid-page.
    window.scrollTo(0, 0);
    // Freeze the background video at the current frame and begin scene-sync
    bgRef.current?.lockAndListen();
    setIntroComplete(true);
    setIsTransitioning(false);
  }, []);

  const dashboardVisible = introComplete;

  // ── Scene navigation — the dashboard is a fixed-viewport deck of scenes
  // (one per SECTIONS entry) instead of a scrolling page. Only one scene is
  // ever on stage; wheel/touch/keyboard/nav-bar input steps activeIndex,
  // which drives both the content crossfade (SceneStage) and the background
  // video's position in the journey (ScrollDrivenBackground.goToProgress). ──
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const activeIndexRef = useRef(0);
  activeIndexRef.current = activeIndex;
  const isSceneTransitioningRef = useRef(false);
  const sceneTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (sceneTransitionTimeoutRef.current) clearTimeout(sceneTransitionTimeoutRef.current);
    };
  }, []);

  const goToIndex = useCallback((idx: number) => {
    if (isSceneTransitioningRef.current) return;
    setActiveIndex((current) => {
      const clamped = Math.max(0, Math.min(SECTIONS.length - 1, idx));
      if (clamped === current) return current;

      setPrevIndex(current);
      isSceneTransitioningRef.current = true;
      bgRef.current?.goToProgress(clamped / (SECTIONS.length - 1));

      if (sceneTransitionTimeoutRef.current) clearTimeout(sceneTransitionTimeoutRef.current);
      sceneTransitionTimeoutRef.current = setTimeout(() => {
        isSceneTransitioningRef.current = false;
        setPrevIndex(clamped);
      }, SCENE_TRANSITION_SECONDS * 1000 + 60);

      return clamped;
    });
  }, []);

  const goToSectionId = useCallback((id: SectionId) => {
    const idx = SECTIONS.findIndex((s) => s.id === id);
    if (idx !== -1) goToIndex(idx);
  }, [goToIndex]);

  // Wheel / touch / keyboard scene stepping. Internal scroll takes priority:
  // if the gesture's target sits inside a scrollable region (a tall table,
  // a long chart list) that hasn't reached its boundary yet, let it scroll
  // normally instead of hijacking the gesture into a scene change.
  useEffect(() => {
    if (!introComplete) return;

    const isEditableTarget = (el: Element | null) => {
      if (!(el instanceof HTMLElement)) return false;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
    };

    const findScrollableAncestor = (el: Element | null, direction: 1 | -1): Element | null => {
      let node: Element | null = el;
      while (node instanceof HTMLElement) {
        const style = window.getComputedStyle(node);
        const canScrollY = /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
        if (canScrollY) {
          const atTop = node.scrollTop <= 1;
          const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
          if (direction === 1 && !atBottom) return node;
          if (direction === -1 && !atTop) return node;
        }
        if (node.id.startsWith("section-")) break; // don't escape the active scene panel
        node = node.parentElement;
      }
      return null;
    };

    const step = (direction: 1 | -1) => {
      if (selectedSurveyId !== null) return;
      goToIndex(activeIndexRef.current + direction);
    };

    const handleWheel = (e: WheelEvent) => {
      if (selectedSurveyId !== null) return;
      if (Math.abs(e.deltaY) < 4) return;
      const direction: 1 | -1 = e.deltaY > 0 ? 1 : -1;
      if (findScrollableAncestor(e.target as Element, direction)) return;
      e.preventDefault();
      step(direction);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      const deltaY = touchStartY - e.touches[0].clientY;
      if (Math.abs(deltaY) < 24) return;
      const direction: 1 | -1 = deltaY > 0 ? 1 : -1;
      if (findScrollableAncestor(e.target as Element, direction)) return;
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
      step(direction);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(document.activeElement)) return;
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        step(-1);
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [introComplete, selectedSurveyId, goToIndex]);

  return (
    <div
      className="text-foreground font-sans selection:bg-[#52B788] selection:text-black"
      style={{
        overflowX: "hidden",
        overflowY: "hidden",
        position: "relative",
        height: "100vh",
        background: "transparent",
      }}
    >
      {/* Global SVG Filters and Gradients for premium chart visual styling */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <filter id="premium-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <feGaussianBlur stdDeviation="2.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="scatter-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4.5" result="blur1" />
            <feGaussianBlur stdDeviation="1.5" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#52B788" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#2D6A4F" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="barGradientAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C8973A" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#7c5912" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="barGradientSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82B8" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#1a3f5c" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="barGradientCoral" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4624A" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#5d2a20" stopOpacity={0.15} />
          </linearGradient>
          <linearGradient id="barGradientSlate" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7aad8a" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#243b2d" stopOpacity={0.15} />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Fixed scroll-driven background video ── */}
      <ScrollDrivenBackground ref={bgRef} />

      {/* ── Noise texture overlay (above video, below content) ── */}
      <div
        className="noise-overlay"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* ── Cinematic Intro ── */}
      {!introComplete && (
        <CinematicIntro
          key="intro"
          onTransitionStart={handleTransitionStart}
          onComplete={handleIntroComplete}
          onReady={handleHeroReady}
        />
      )}

      {/* ── Top Navigation ── */}
      <TopNav
        visible={introComplete}
        activeSection={SECTIONS[activeIndex].id}
        onNavigate={goToSectionId}
      />

      {/* ── Fixed-viewport scene deck — one section on stage at a time ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10,
          // Fade-in once intro completes. No vertical offset here — the
          // dashboard header's layout position must stay put so the
          // traveling hero text's docking target is measured accurately.
          opacity: dashboardVisible ? 1 : 0,
          transition: "opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
          pointerEvents: dashboardVisible ? "auto" : "none",
        }}
      >
        <SceneStage
          activeIndex={activeIndex}
          prevIndex={prevIndex}
          scenes={[
            { id: "dashboard", node: <Dashboard reveal={dashboardVisible} dockTargetRef={heroDockTargetRef} /> },
            { id: "map", node: <DistrictMap /> },
            { id: "analytics", node: <AdvancedAnalyticsPage onRowClick={setSelectedSurveyId} /> },
            { id: "yield", node: <YieldPage onRowClick={setSelectedSurveyId} /> },
            { id: "identity", node: <IdentityPage onRowClick={setSelectedSurveyId} /> },
            { id: "land", node: <LandPage onRowClick={setSelectedSurveyId} /> },
            { id: "fertilizer", node: <FertilizerPage onRowClick={setSelectedSurveyId} /> },
            { id: "ratoon", node: <RatoonPage onRowClick={setSelectedSurveyId} /> },
            { id: "climate", node: <ClimatePage onRowClick={setSelectedSurveyId} /> },
            { id: "long_tail_fert", node: <LongTailFertPage onRowClick={setSelectedSurveyId} /> },
            { id: "long_tail_org", node: <LongTailOrgPage onRowClick={setSelectedSurveyId} /> },
          ]}
        />
      </div>

      {/* ── Traveling hero text — persists for the entire app lifetime.
          Lives above the intro video during the intro, magic-moves into the
          dashboard header on transition, and docks there for good. Rendered
          after the dashboard content above so that, on mount, Dashboard's
          dock-target ref is already attached by the time this component's
          layout effect (which measures it for the skip-intro case) runs —
          React commits layout effects bottom-up in sibling/JSX order. Once
          docked it also behaves as dashboard-header content: it fades with
          the Main Dashboard scene like everything else on that panel. ── */}
      <HeroTravelText
        ref={heroTextRef}
        ready={heroReady || skipIntroRef.current}
        dockTargetRef={heroDockTargetRef}
        startDocked={skipIntroRef.current}
        dashboardSceneActive={activeIndex === 0}
      />

      {/* ── Farmer Profile Modal ── */}
      {selectedSurveyId !== null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
          }}
        >
          <FarmerProfile
            surveyId={selectedSurveyId}
            onClose={() => setSelectedSurveyId(null)}
          />
        </div>
      )}
    </div>
  );
}
