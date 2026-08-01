import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { TopNav, SectionId } from "./components/TopNav";
import { DistrictMap } from "./components/Map";
import { DataTable } from "./components/DataTable";
import { FarmerProfile } from "./components/FarmerProfile";
import { Card, KPICard } from "./components/DeepDiveLayout";
import {
  getSummary,
  getIdentityPageData,
  getLandPageData,
  getYieldPageData,
  getRatoonPageData,
  getFertilizerPageData,
  getClimatePageData,
  getLongTailFertPageData,
  getLongTailOrgPageData,
  getAnalyticsRaw,
  SummaryStats,
  AnalyticsRow,
} from "./lib/api";
import {
  BarChart, Bar, ScatterChart, Scatter,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer
} from "recharts";


const C = {
  g1: "#2D6A4F", g2: "#40916C", g3: "#52B788", g4: "#74C69D", g5: "#95D5B2",
  amber: "#C8973A", slate: "#445566", coral: "#D4624A", sky: "#3B82B8"
};
const nf = new Intl.NumberFormat("en-IN");

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border bg-card/95 backdrop-blur-md p-3 rounded-xl shadow-lg text-xs border-border">
      {label && <p className="font-semibold mb-2 border-b border-border pb-1 text-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-3 justify-between mt-1">
          <span className="flex items-center gap-1.5" style={{ color: p.color || p.fill || 'var(--foreground)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill || 'var(--foreground)' }} />
            {p.name}
          </span>
          <strong className="ml-3 text-foreground">{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function useChartAnimation(staggerBase = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = true;
  const [animKey] = useState(0);
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
  const scatterProps = {
    isAnimationActive: inView,
    animationBegin: staggerBase,
    animationDuration: 1000,
    animationEasing: "ease-out" as const,
  };
  return { ref, inView, animKey, barProps, lineProps, scatterProps };
}

// Data Record Types
type IdentityRecord = {
  surveyId: number; farmerCode: string; name: string; mobileNumber: string | null;
  collectionDate: string | null; employee: string | null; village: string; block: string;
};
type LandRecord = { surveyId: number; name: string; village: string; largestPlotAcres: number | null; landAreaHa: number | null };
type YieldRecord = { surveyId: number; name: string; village: string; acres: number; yield: number; tna: number };
type RatoonRecord = { surveyId: number; name: string; village: string; crop: string; wishNextRatoon: string };
type FertilizerRecord = { surveyId: number; name: string; village: string; method: string };
type ClimateRecord = { surveyId: number; name: string; village: string; severeEvents: string; growthStage: string };

const MemoDistrictMap = memo(DistrictMap);

// ─────────────────────────────────────────────────────────────────────────────
// Section Header Component
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ chapter, title, subtitle }: { chapter: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
        {chapter}
      </span>
      <h2 className="text-3xl font-bold font-outfit text-foreground mt-2 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted-foreground text-sm max-w-3xl mt-1 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact KPI Card for the Overview status strip — premium enterprise style
// ─────────────────────────────────────────────────────────────────────────────
function CompactKPICard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div
      className="glass-card-master rounded-2xl px-5 py-5 flex flex-col gap-2 cursor-default transition-all duration-200 hover:-translate-y-1 relative overflow-hidden"
    >
      {/* Subtle accent tint overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{ background: `linear-gradient(135deg, ${accent} 0%, transparent 60%)` }}
      />
      {/* Top row: data-live indicator */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          className="text-[9px] uppercase tracking-[0.18em] font-bold"
          style={{ color: accent, opacity: 0.8 }}
        >
          {label}
        </span>
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: accent, opacity: 0.5 }}
        />
      </div>
      {/* Value */}
      <p className="text-[28px] font-extrabold font-outfit leading-none text-foreground tracking-tight">
        {typeof value === "number" ? nf.format(value) : value}
      </p>
      {/* Bottom rule */}
      <div
        className="h-px w-8 mt-1 rounded-full opacity-30"
        style={{ backgroundColor: accent }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Overview & Geography Page
// ─────────────────────────────────────────────────────────────────────────────
function OverviewGeographyPage() {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getSummary(), getAnalyticsRaw()])
      .then(([sum, raw]) => {
        if (!cancelled) {
          setSummary(sum);
          setAnalyticsRows(raw);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const scatterData = useMemo(() => {
    if (!analyticsRows) return [];
    return analyticsRows
      .filter((row) => (row.yield || 0) > 0 && (row.n || 0) > 0)
      .map((row) => ({
        n: row.n,
        yield: row.yield,
        name: row.name,
        village: row.village,
      }));
  }, [analyticsRows]);

  const chartScatter = useChartAnimation(0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <SectionHeader
        chapter="Section 01"
        title="Overview & Geography"
        subtitle="District-wide spatial distribution, farmer GPS locations, and macro yield vs nitrogen efficiency."
      />

      {/* Top 6 KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="Total Farmers" value={summary?.totalFarmers ?? 0} color={C.g3} />
        <KPICard label="Total Acreage" value={`${nf.format(Math.round(summary?.totalAcres ?? 0))} ac`} color={C.amber} />
        <KPICard label="Average Yield" value={`${summary?.avgYield ?? 0} t/ha`} color={C.g4} />
        <KPICard label="Average Nitrogen" value={`${summary?.avgNitrogen ?? 0} kg`} color={C.coral} />
        <KPICard label="Crop Split" value={`${summary?.ratoonPct ?? 0}% Ratoon`} sub={`${summary?.plantCropPct ?? 0}% Plant Crop`} color={C.sky} />
        <KPICard label="Climate Impact" value={`${summary?.stressedYearPct ?? 0}% Stressed`} sub={`${summary?.normalYearPct ?? 0}% Normal Year`} color={C.slate} />
      </div>

      {/* Two-Column Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT (65–70% Width) - District Map */}
        <Card title="District Spatial Map & Real GPS Farmer Locations" className="lg:col-span-2 h-[540px]">
          <MemoDistrictMap />
        </Card>

        {/* RIGHT (30–35% Width) - Scatter Plot */}
        <Card title="Nitrogen vs Yield Efficiency" className="lg:col-span-1 h-[540px]">
          <div className="h-full flex flex-col justify-between" ref={chartScatter.ref}>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              Scatter plot showing crop yield (t/ha) relative to total nitrogen application (kg/ha) across surveyed plots.
            </p>
            <div className="flex-1 min-h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart key={chartScatter.animKey} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="n" name="Nitrogen (kg)" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Nitrogen (kg/ha)', position: 'insideBottom', offset: -10, fill: 'var(--muted-foreground)', fontSize: 10 }} />
                  <YAxis type="number" dataKey="yield" name="Yield (t/ha)" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} label={{ value: 'Yield (t/ha)', angle: -90, position: 'insideLeft', fill: 'var(--muted-foreground)', fontSize: 10 }} />
                  <ReTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                  <Scatter name="Farmers" data={scatterData} fill={C.g3} opacity={0.7} {...chartScatter.scatterProps} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* Compact KPI strip — replaces the former 4 status chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <CompactKPICard
          label="Farmers Surveyed"
          value={summary?.totalFarmers ?? 0}
          accent={C.g3}
        />
        <CompactKPICard
          label="Villages Surveyed"
          value={12}
          accent={C.amber}
        />
        <CompactKPICard
          label="Agricultural Blocks"
          value={4}
          accent={C.sky}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Farmer & Land Profile Page
// ─────────────────────────────────────────────────────────────────────────────
function FarmerLandProfilePage({ onRowClick }: { onRowClick: (id: number) => void }) {
  const [idData, setIdData] = useState<any>(null);
  const [landData, setLandData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getIdentityPageData(), getLandPageData()])
      .then(([idRes, landRes]) => {
        if (!cancelled) {
          setIdData(idRes);
          setLandData(landRes);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartA = useChartAnimation(0);
  const chartC = useChartAnimation(80);
  const chartD = useChartAnimation(160);

  if (loading || !idData || !landData) return <div className="p-8 text-muted-foreground">Loading farmer & land profile data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <SectionHeader
        chapter="Section 02"
        title="Farmer & Land Profile"
        subtitle="Demographic baseline, education levels, village distribution, and plot acreage metrics."
      />

      {/* Top 6 KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard label="Total Farmers" value={idData.totalFarmers} color={C.g1} />
        <KPICard label="Top Village" value={idData.topVillage} color={C.amber} />
        <KPICard label="Most Common Education" value={idData.topEdu} color={C.sky} />
        <KPICard label="Total Acreage" value={`${nf.format(Math.round(landData.totalAcres))} ac`} color={C.amber} />
        <KPICard label="Average Plot Size" value={`${landData.avgPlot} ac`} color={C.sky} />
        <KPICard label="Average Yield" value={`${landData.avgYield} t/ha`} color={C.g3} />
      </div>

      {/* Dense Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min grid-flow-dense">
        {/* Farmers by Village - MD */}
        <Card title="Farmers by Village (Top 10)" className="lg:col-span-1">
          <div className="h-56" ref={chartA.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartA.animKey} data={idData.villageData} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                <Bar dataKey="value" name="Farmers" fill={C.g3} radius={[0, 4, 4, 0]} maxBarSize={20} {...chartA.barProps} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Education vs Average Yield - MD */}
        <Card title="Education vs Average Yield (t/ha)" className="lg:col-span-1">
          <div className="h-56" ref={chartC.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart key={chartC.animKey} data={idData.eduData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.3 }} />
                <Bar yAxisId="left" dataKey="Farmers" fill={C.g2} radius={[4, 4, 0, 0]} maxBarSize={30} {...chartC.barProps} />
                <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke={C.amber} strokeWidth={2.5} dot={{ r: 3.5, fill: C.amber }} activeDot={{ r: 5 }} {...chartC.lineProps} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Irrigation Method: Acreage vs Yield - MD */}
        <Card title="Irrigation Method: Acreage vs Yield" className="lg:col-span-1">
          <div className="h-56" ref={chartD.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart key={chartD.animKey} data={landData.yieldIrrData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar yAxisId="left" dataKey="TotalAcres" name="Total Acres" fill={C.sky} radius={[4, 4, 0, 0]} maxBarSize={35} {...chartD.barProps} />
                <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke={C.g3} strokeWidth={2.5} dot={{ r: 3.5, fill: C.g3 }} activeDot={{ r: 5 }} {...chartD.lineProps} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Identity Records DataTable - LG */}
        <div className="lg:col-span-3">
          <DataTable<IdentityRecord>
            title="Identity Records"
            data={idData.records}
            searchFields={r => `${r.name} ${r.farmerCode}`}
            onRowClick={r => r.surveyId && onRowClick(r.surveyId)}
            columns={[
              { header: "Farmer Code", accessor: r => <span className="font-mono text-xs">{r.farmerCode}</span> },
              { header: "Name", accessor: r => <span className="font-semibold text-foreground">{r.name}</span> },
              { header: "Mobile Number", accessor: r => r.mobileNumber || "-" },
              { header: "Collection Date", accessor: r => r.collectionDate || "-" },
              { header: "Employee", accessor: r => r.employee || "-" },
              { header: "Village", accessor: r => r.village },
              { header: "Block", accessor: r => r.block },
            ]}
          />
        </div>

        {/* Land Records DataTable - LG */}
        <div className="lg:col-span-3">
          <DataTable<LandRecord>
            title="Land Records"
            data={landData.records}
            searchFields={r => `${r.name} ${r.village}`}
            onRowClick={r => r.surveyId && onRowClick(r.surveyId)}
            columns={[
              { header: "Name", accessor: r => <span className="font-semibold text-foreground">{r.name}</span> },
              { header: "Village", accessor: r => r.village },
              { header: "Size of Largest Plot (Acres)", align: "right", accessor: r => <span className="font-semibold text-[#2D6A4F]">{r.largestPlotAcres ?? '-'}</span> },
              { header: "Land Area (Ha)", align: "right", accessor: r => <span className="font-semibold text-[#2D6A4F]">{r.landAreaHa ?? '-'}</span> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Yield & Crop Management Page
// ─────────────────────────────────────────────────────────────────────────────
function YieldCropManagementPage({ onRowClick }: { onRowClick: (id: number) => void }) {
  const [yieldData, setYieldData] = useState<any>(null);
  const [ratoonData, setRatoonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getYieldPageData(), getRatoonPageData()])
      .then(([yRes, rRes]) => {
        if (!cancelled) {
          setYieldData(yRes);
          setRatoonData(rRes);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartN = useChartAnimation(0);
  const chartO = useChartAnimation(80);
  const chartH = useChartAnimation(160);

  if (loading || !yieldData || !ratoonData) return <div className="p-8 text-muted-foreground">Loading yield & crop management data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <SectionHeader
        chapter="Section 03"
        title="Yield & Crop Management"
        subtitle="Crop yield distributions, total nitrogen applied (TNA), plot size correlation, and ratoon planning."
      />

      {/* Top 5 KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard label="Average Yield" value={`${yieldData.avgYield} t/ha`} color={C.g3} />
        <KPICard label="Average TNA" value={`${yieldData.avgN} kg`} color={C.sky} />
        <KPICard label="Maximum Yield" value={`${yieldData.maxYield} t/ha`} color={C.amber} />
        <KPICard label="% Current Ratoon" value={`${ratoonData.pctRatoon}%`} color={C.g1} />
        <KPICard label="% Planning Next Ratoon" value={`${ratoonData.pctNext}%`} color={C.sky} />
      </div>

      {/* Dense Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min grid-flow-dense">
        {/* Nitrogen Applied vs Average Yield - MD */}
        <Card title="Nitrogen Applied vs Average Yield (Combo)" className="lg:col-span-1">
          <div className="h-56" ref={chartN.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart key={chartN.animKey} data={yieldData.comboData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar yAxisId="left" dataKey="Farmers" fill={C.sky} radius={[4, 4, 0, 0]} maxBarSize={30} {...chartN.barProps} />
                <Line yAxisId="right" type="monotone" dataKey="AvgYield" name="Avg Yield (t/ha)" stroke={C.g3} strokeWidth={2.5} dot={{ r: 3.5, fill: C.g3 }} activeDot={{ r: 5 }} {...chartN.lineProps} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Plot Size vs Yield Scatter - MD */}
        <Card title="Plot Size vs Yield (Scatter)" className="lg:col-span-1">
          <div className="h-56" ref={chartO.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart key={chartO.animKey} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" dataKey="acres" name="Acres" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="number" dataKey="yield" name="Yield (t/ha)" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Scatter name="Farmers" data={yieldData.scatterData} fill={C.amber} opacity={0.7} {...chartO.scatterProps} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Plant Crop vs Ratoon Types - SM */}
        <Card title="Plant Crop vs Ratoon Types" className="lg:col-span-1">
          <div className="h-56" ref={chartH.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartH.animKey} data={ratoonData.rtData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" name="Farmers" fill={C.g2} radius={[4, 4, 0, 0]} maxBarSize={35} {...chartH.barProps} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Yield & Nutrition Records DataTable - LG */}
        <div className="lg:col-span-3">
          <DataTable<YieldRecord>
            title="Yield & Nutrition Records"
            data={yieldData.records}
            searchFields={r => `${r.name} ${r.village}`}
            onRowClick={r => r.surveyId && onRowClick(r.surveyId)}
            columns={[
              { header: "Name", accessor: r => <span className="font-semibold text-foreground">{r.name}</span> },
              { header: "Village", accessor: r => r.village },
              { header: "Plot Size (Acres)", align: "right", accessor: r => <span className="font-semibold text-[#2D6A4F]">{r.acres}</span> },
              { header: "Yield (t/ha)", align: "right", accessor: r => <span className="font-bold text-[#52B788]">{r.yield || '-'}</span> },
              { header: "TNA (kg)", align: "right", accessor: r => <span className="font-bold text-[#3B82B8]">{r.tna || '-'}</span> },
            ]}
          />
        </div>

        {/* Ratoon Records DataTable - LG */}
        <div className="lg:col-span-3">
          <DataTable<RatoonRecord>
            title="Ratoon Planning Records"
            data={ratoonData.records}
            searchFields={r => `${r.name} ${r.village}`}
            onRowClick={r => r.surveyId && onRowClick(r.surveyId)}
            columns={[
              { header: "Name", accessor: r => <span className="font-semibold text-foreground">{r.name}</span> },
              { header: "Village", accessor: r => r.village },
              { header: "Current Crop", accessor: r => r.crop },
              { header: "Wish to go for next Ratoon?", accessor: r => {
                  const ans = r.wishNextRatoon;
                  return <span className={ans === 'Yes' ? 'text-[#2D6A4F] font-semibold' : 'text-muted-foreground'}>{ans || '-'}</span>;
                }
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Fertilizer & Nutrient Use Page
// ─────────────────────────────────────────────────────────────────────────────
function FertilizerNutrientUsePage({ onRowClick }: { onRowClick: (id: number) => void }) {
  const [fertData, setFertData] = useState<any>(null);
  const [longTailFert, setLongTailFert] = useState<any>(null);
  const [longTailOrg, setLongTailOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getFertilizerPageData(), getLongTailFertPageData(), getLongTailOrgPageData()])
      .then(([fRes, lFertRes, lOrgRes]) => {
        if (!cancelled) {
          setFertData(fRes);
          setLongTailFert(lFertRes);
          setLongTailOrg(lOrgRes);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const chartF = useChartAnimation(0);
  const chartG = useChartAnimation(80);
  const chartLF = useChartAnimation(160);
  const chartLO = useChartAnimation(240);

  if (loading || !fertData || !longTailFert || !longTailOrg) return <div className="p-8 text-muted-foreground">Loading fertilizer & nutrient data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <SectionHeader
        chapter="Section 04"
        title="Fertilizer & Nutrient Use"
        subtitle="Application methodology, core fertilizer consumption (Urea, DAP), and specialty organic inputs."
      />

      {/* Top 7 KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <KPICard label="Most Common Method" value={fertData.methData[0]?.name || "N/A"} color={C.sky} />
        <KPICard label="Average Nitrogen" value={`${fertData.avgN} kg`} color={C.coral} />
        <KPICard label="Total Urea" value={`${nf.format(fertData.fertData.find((f: any) => f.name === "Urea")?.value || 0)} kg`} color={C.g1} />
        <KPICard label="Most Used Long-tail" value={longTailFert.top} color={C.coral} />
        <KPICard label="Farmers Using Long-tail" value={longTailFert.usingAny} color={C.slate} />
        <KPICard label="Most Used Organic" value={longTailOrg.top} color={C.g5} />
        <KPICard label="Total Organic Volume" value={`${nf.format(longTailOrg.vol)} kg`} color={C.amber} />
      </div>

      {/* Dense Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min grid-flow-dense">
        {/* Top Core Fertilizers - LG (2 cols) */}
        <Card title="Top Core Fertilizers (Total Kg)" className="lg:col-span-2">
          <div className="h-56" ref={chartF.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartF.animKey} data={fertData.fertData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" name="Total Kg" fill={C.coral} radius={[0, 4, 4, 0]} maxBarSize={20} {...chartF.barProps} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Application Method Distribution - MD */}
        <Card title="Application Method Distribution" className="lg:col-span-1">
          <div className="h-56" ref={chartG.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartG.animKey} data={fertData.methData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" name="Farmers" fill={C.slate} radius={[4, 4, 0, 0]} maxBarSize={35} {...chartG.barProps} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Long-tail Fertilizers - MD */}
        <Card title="Specialty Fertilizer Usage (Farmers)" className="lg:col-span-1.5">
          <div className="h-56" ref={chartLF.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartLF.animKey} data={longTailFert.chartData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 9 }} interval={0} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" name="Farmers" fill={C.coral} radius={[4, 4, 0, 0]} maxBarSize={35} {...chartLF.barProps} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Organic Inputs Usage - MD */}
        <Card title="Organic Inputs Usage (Farmers)" className="lg:col-span-1.5">
          <div className="h-56" ref={chartLO.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartLO.animKey} data={longTailOrg.chartData} margin={{ bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" name="Farmers" fill={C.g3} radius={[4, 4, 0, 0]} maxBarSize={45} {...chartLO.barProps} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Method Records DataTable - LG */}
        <div className="lg:col-span-3">
          <DataTable<FertilizerRecord>
            title="Fertilizer Method Records"
            data={fertData.records}
            searchFields={r => `${r.name} ${r.method}`}
            onRowClick={r => r.surveyId && onRowClick(r.surveyId)}
            columns={[
              { header: "Name", accessor: r => <span className="font-semibold text-foreground">{r.name}</span> },
              { header: "Village", accessor: r => r.village },
              { header: "Method", accessor: r => <span className="bg-muted px-3 py-1 rounded-full text-xs border border-border">{r.method || 'Unknown'}</span> },
            ]}
          />
        </div>

        {/* Fertilizer Usage Records DataTable - LG */}
        <div className="lg:col-span-3">
          <DataTable<Record<string, any>>
            title="Specialty Fertilizer Usage Records (Kg)"
            data={longTailFert.records}
            searchFields={r => `${r.name}`}
            onRowClick={r => r.surveyId && onRowClick(r.surveyId)}
            columns={[
              { header: "Name", accessor: r => <span className="font-semibold text-foreground">{r.name}</span> },
              { header: "SSP", align: "right", accessor: r => r["SSP"] ?? '-' },
              { header: "NPK 10-26-26", align: "right", accessor: r => r["NPK 10-26-26"] ?? '-' },
              { header: "Amm. Sulphate", align: "right", accessor: r => r["Amm. Sulphate"] ?? '-' },
              { header: "NPK 17-17-17", align: "right", accessor: r => r["NPK 17-17-17"] ?? '-' },
              { header: "CAN", align: "right", accessor: r => r["CAN"] ?? '-' },
            ]}
          />
        </div>

        {/* Organic Usage Records DataTable - LG */}
        <div className="lg:col-span-3">
          <DataTable<{ surveyId: number; name: string; vermicompost: number | null; goatSheepManure: number | null; poultryManure: number | null; jeevamrut: number | null }>
            title="Organic Input Usage Records (Kg)"
            data={longTailOrg.records}
            searchFields={r => `${r.name}`}
            onRowClick={r => r.surveyId && onRowClick(r.surveyId)}
            columns={[
              { header: "Name", accessor: r => <span className="font-semibold text-foreground">{r.name}</span> },
              { header: "Vermicompost", align: "right", accessor: r => r.vermicompost ?? '-' },
              { header: "Goat/Sheep Manure", align: "right", accessor: r => r.goatSheepManure ?? '-' },
              { header: "Poultry Manure", align: "right", accessor: r => r.poultryManure ?? '-' },
              { header: "Jeevamrut", align: "right", accessor: r => r.jeevamrut ?? '-' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Climate & Advanced Analytics Page
// ─────────────────────────────────────────────────────────────────────────────
function ClimateAdvancedAnalyticsPage({ onRowClick }: { onRowClick: (id: number) => void }) {
  const [climateData, setClimateData] = useState<any>(null);
  const [analyticsRows, setAnalyticsRows] = useState<AnalyticsRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getClimatePageData(), getAnalyticsRaw()])
      .then(([cRes, aRes]) => {
        if (!cancelled) {
          setClimateData(cRes);
          setAnalyticsRows(aRes);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const analytics = useMemo(() => {
    const data = analyticsRows || [];
    const validRows = data.filter((row) => (row.yield || 0) > 0 && (row.n || 0) > 0);
    const villageMap: Record<string, { name: string; yieldSum: number; nitrogenSum: number; count: number }> = {};
    const quadrant = {
      target: [] as AnalyticsRow[],
      excessive: [] as AnalyticsRow[],
      underfertilized: [] as AnalyticsRow[],
      critical: [] as AnalyticsRow[],
    };

    data.forEach((row) => {
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

    const villageRankings = Object.values(villageMap)
      .map((entry) => {
        const averageYield = entry.yieldSum / entry.count;
        const averageNitrogen = entry.nitrogenSum / entry.count;
        return {
          name: entry.name,
          averageYield: Math.round((averageYield) * 100) / 100,
          averageNitrogen: Math.round((averageNitrogen) * 100) / 100,
          efficiency: averageNitrogen > 0 ? Math.round((averageYield / averageNitrogen) * 10000) / 10000 : 0,
          farmCount: entry.count,
        };
      })
      .sort((a, b) => b.averageYield - a.averageYield);

    const topFarmers = [...validRows].sort((a, b) => (b.yield || 0) - (a.yield || 0)).slice(0, 5);
    const outliers = [...quadrant.critical].sort((a, b) => (b.n || 0) - (a.n || 0)).slice(0, 5);

    return { villageRankings, topFarmers, outliers, quadrant };
  }, [analyticsRows]);

  const chartJ = useChartAnimation(0);
  const chartK = useChartAnimation(80);

  if (loading || !climateData) return <div className="p-8 text-muted-foreground">Loading climate & advanced analytics data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      <SectionHeader
        chapter="Section 05"
        title="Climate & Advanced Analytics"
        subtitle="Severe weather events, nitrogen efficiency quadrant segmentation, village leaderboards, and critical outliers."
      />

      {/* Top 3 KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard label="% Normal Year" value={`${climateData.pctNormal}%`} color={C.sky} />
        <KPICard label="% Stressed Year" value={`${100 - climateData.pctNormal}%`} color={C.amber} />
        <KPICard label="Top Stressor" value={climateData.topStress} color={C.coral} />
      </div>

      {/* Dense Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min grid-flow-dense">
        {/* Severe Climate Events - MD */}
        <Card title="Severe Climate Events" className="lg:col-span-1">
          <div className="h-56" ref={chartJ.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartJ.animKey} data={climateData.evData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" name="Reports" fill={C.coral} radius={[4, 4, 0, 0]} maxBarSize={35} {...chartJ.barProps} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Nitrogen Efficiency Quadrant Analysis - LG (2 cols) */}
        <Card title="Nitrogen Efficiency Quadrant Analysis" className="lg:col-span-2">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Efficient Target</span>
                  <span className="block text-[10.5px] text-emerald-900/70 mt-1.5 font-medium">High Yield, Low Nitrogen</span>
                </div>
                <strong className="block text-2xl text-emerald-800 mt-2 font-outfit">{analytics.quadrant.target.length} Farms</strong>
              </div>
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Excessive N</span>
                  <span className="block text-[10.5px] text-amber-900/70 mt-1.5 font-medium">High Yield, High Nitrogen</span>
                </div>
                <strong className="block text-2xl text-amber-800 mt-2 font-outfit">{analytics.quadrant.excessive.length} Farms</strong>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">Under-fertilized</span>
                  <span className="block text-[10.5px] text-slate-600 mt-1.5 font-medium">Low Yield, Low Nitrogen</span>
                </div>
                <strong className="block text-2xl text-slate-700 mt-2 font-outfit">{analytics.quadrant.underfertilized.length} Farms</strong>
              </div>
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">Critical Outliers</span>
                  <span className="block text-[10.5px] text-rose-900/70 mt-1.5 font-medium">Low Yield, High Nitrogen</span>
                </div>
                <strong className="block text-2xl text-rose-800 mt-2 font-outfit">{analytics.quadrant.critical.length} Farms</strong>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-xl border border-border flex items-start gap-2">
              <span className="text-primary font-bold text-sm shrink-0 mt-0.5 leading-none" aria-hidden="true">▸</span>
              <p className="text-xs text-foreground/80 leading-relaxed">
                <strong>EDF Extension Recommendation:</strong> Prioritize training and diagnostic field visits for the {analytics.quadrant.critical.length} critical outlier farms applying high nitrogen without proportionate yield return.
              </p>
            </div>
          </div>
        </Card>

        {/* Village Rankings Leaderboard - MD */}
        <Card title="Village Yield Rankings Leaderboard" className="lg:col-span-1">
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-muted text-muted-foreground uppercase tracking-wider font-semibold border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-2 text-center">Rank</th>
                  <th className="py-2 px-2">Village</th>
                  <th className="py-2 px-2 text-right">Avg Yield</th>
                  <th className="py-2 px-2 text-right">Eff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.villageRankings.map((village, index) => (
                  <tr key={village.name} className="hover:bg-muted/40 transition-colors">
                    <td className="py-2 px-2 text-center font-bold text-muted-foreground">{index + 1}</td>
                    <td className="py-2 px-2 font-semibold text-foreground truncate max-w-[85px]" title={village.name}>{village.name}</td>
                    <td className="py-2 px-2 text-right font-semibold text-foreground">{village.averageYield} t/ha</td>
                    <td className="py-2 px-2 text-right font-mono text-[10px] text-primary font-semibold">
                      {village.efficiency.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* High Productivity Farmers Leaderboard - MD */}
        <Card title="High Productivity Farmers Leaderboard" className="lg:col-span-1">
          <div className="space-y-2.5 text-xs max-h-[300px] overflow-y-auto pr-1">
            {analytics.topFarmers.map((farmer, index) => (
              <div key={farmer.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-extrabold text-xs text-muted-foreground w-4 text-center shrink-0">#{index + 1}</span>
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground block truncate text-xs">{farmer.name}</span>
                    <span className="text-[9.5px] text-muted-foreground font-mono block truncate">{farmer.id} ({farmer.village})</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <strong className="block text-xs text-foreground">{farmer.yield.toFixed(1)} t/ha</strong>
                  <span className="text-[8.5px] text-primary font-semibold block">N: {farmer.n.toFixed(1)} kg</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Critical Outliers - MD */}
        <Card title="Critical Nitrogen Inefficiency Outliers" className="lg:col-span-1">
          <div className="space-y-2.5 text-xs max-h-[300px] overflow-y-auto pr-1">
            {analytics.outliers.length > 0 ? (
              analytics.outliers.map((farmer) => (
                <button
                  key={farmer.id}
                  type="button"
                  onClick={() => onRowClick(farmer.surveyId)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-left border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 transition-colors shadow-2xs cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-rose-950 block truncate text-xs">{farmer.name}</span>
                    <span className="text-[9.5px] text-rose-800/70 font-mono block truncate">{farmer.id} ({farmer.village})</span>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <strong className="block text-xs text-rose-700">{farmer.n.toFixed(0)} kg N</strong>
                    <span className="text-[8.5px] text-rose-900/60 block font-medium">Yield: {farmer.yield.toFixed(1)} t/ha</span>
                  </div>
                </button>
              ))
            ) : (
              <span className="text-muted-foreground italic block text-center py-6">No outliers found in current dataset.</span>
            )}
          </div>
        </Card>

        {/* Growth Stage Impacted - SM */}
        <Card title="Growth Stage Impacted" className="lg:col-span-1">
          <div className="h-56" ref={chartK.ref}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={chartK.animKey} data={climateData.stData} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <ReTooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" name="Reports" fill={C.g3} radius={[0, 4, 4, 0]} maxBarSize={20} {...chartK.barProps} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Climate Records DataTable - LG */}
        <div className="lg:col-span-3">
          <DataTable<ClimateRecord>
            title="Climate Records"
            data={climateData.records}
            searchFields={r => `${r.name} ${r.severeEvents} ${r.growthStage}`}
            onRowClick={r => r.surveyId && onRowClick(r.surveyId)}
            columns={[
              { header: "Name", accessor: r => <span className="font-semibold text-foreground">{r.name}</span> },
              { header: "Village", accessor: r => r.village },
              { header: "Severe Climatic Events", accessor: r => <span className="text-rose-600 font-semibold">{r.severeEvents || 'None'}</span> },
              { header: "Growth Stage Impacted", accessor: r => r.growthStage || '-' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Enterprise Multi-Page Application Component
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);

  // Initialize active route tab from URL hash or default to 'overview'
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    const hash = window.location.hash.replace("#/", "").replace("#", "") as SectionId;
    const validSections: SectionId[] = ["overview", "farmers", "yield", "fertilizer", "climate"];
    return validSections.includes(hash) ? hash : "overview";
  });

  // Permanent Light Theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("dark");
    try { localStorage.setItem("edf_theme", "light"); } catch {}
  }, []);

  // Instant multi-page route switching with URL hash sync
  const handleNavigate = useCallback((id: SectionId) => {
    setActiveSection(id);
    window.location.hash = `#/${id}`;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // Sync hash changes (browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").replace("#", "") as SectionId;
      const validSections: SectionId[] = ["overview", "farmers", "yield", "fertilizer", "climate"];
      if (validSections.includes(hash)) {
        setActiveSection(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white">
      {/* Sticky Top Header */}
      <TopNav activeSection={activeSection} onNavigate={handleNavigate} />

      {/* Dedicated Multi-Page Active Route Area */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8">
        {activeSection === "overview" && <OverviewGeographyPage />}
        {activeSection === "farmers" && <FarmerLandProfilePage onRowClick={setSelectedSurveyId} />}
        {activeSection === "yield" && <YieldCropManagementPage onRowClick={setSelectedSurveyId} />}
        {activeSection === "fertilizer" && <FertilizerNutrientUsePage onRowClick={setSelectedSurveyId} />}
        {activeSection === "climate" && <ClimateAdvancedAnalyticsPage onRowClick={setSelectedSurveyId} />}
      </main>

      {/* Farmer Profile Modal */}
      {selectedSurveyId !== null && (
        <FarmerProfile
          surveyId={selectedSurveyId}
          onClose={() => setSelectedSurveyId(null)}
        />
      )}
    </div>
  );
}
