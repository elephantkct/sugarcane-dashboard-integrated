import { useMemo, useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "motion/react";

import { Users, MapPin, TrendingUp, FlaskConical, Leaf, CloudSun } from "lucide-react";
import { getSummary, SummaryStats } from "../lib/api";
import { ENTER_DELAY_S, ENTER_STAGGER_S, CONTENT_DURATION_S } from "./SceneStage";

const EASE_CINEMATIC = [0.45, 0, 0.55, 1] as const; // matches the background camera's own easing

const C = {
  g1: "#2D6A4F", g2: "#40916C", g3: "#52B788", g4: "#74C69D", g5: "#95D5B2",
  amber: "#C8973A", slate: "#445566", coral: "#D4624A", sky: "#3B82B8"
};
const nf = new Intl.NumberFormat("en-IN");

// ── Animated number counter hook ──────────────────────────────────
function useCountUp(target: number, duration = 0.8, shouldStart = false) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;
    setValue(0);
    if (target === 0) return;

    const controls = animate(0, target, {
      duration: duration,
      ease: [0.16, 1, 0.3, 1], // Apple easing
      onUpdate: (latest) => {
        setValue(latest);
      }
    });
    return () => controls.stop();
  }, [target, duration, shouldStart]);

  return value;
}

// ── Stagger container variants — the delay before cards start rising is
// longer the very first time (it waits out the intro's hero-text travel),
// then shortens to match the scene-transition camera timing on every later
// revisit — see hasRevealedOnceRef below.
const makeContainerVariants = (delayChildren: number) => ({
  hidden: {},
  visible: { transition: { staggerChildren: ENTER_STAGGER_S, delayChildren } },
});

// Cards travel the same distance, in the same time, as the background
// camera — they start deep in the field the instant the camera starts
// moving and arrive as it settles, so the two read as one physical motion
// rather than a background move plus a separate card fade. Blur is real but
// brief: it resolves in the first third of the journey (cheap, short-lived
// repaint) while the transform keeps gliding — GPU-only compositing — for
// the rest. Opacity is the last, fastest-arriving property, a finishing
// touch rather than something the reveal visibly waits on.
const itemVariants = {
  hidden: { opacity: 0, y: 24, z: -200, scale: 0.86, filter: "blur(13px)" },
  visible: {
    opacity: 1, y: 0, z: 0, scale: 1, filter: "blur(0px)",
    transition: {
      default: { duration: CONTENT_DURATION_S, ease: EASE_CINEMATIC },
      filter: { duration: CONTENT_DURATION_S * 0.35, ease: EASE_CINEMATIC },
      opacity: { duration: 0.4, delay: CONTENT_DURATION_S - 0.45 },
    },
  },
};

// ── KPI Card with animated number ─────────────────────────────────
interface KPIData {
  label: string;
  value: string;
  numericValue: number;
  prefix: string;
  suffix: string;
  icon: React.ReactNode;
  color: string;
  sub?: string;
  colSpan?: number;
  rowSpan?: number;
}

function AnimatedKPICard({ kpi, index, reveal }: { kpi: KPIData; index: number; reveal: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // once:false — the card leaves view (display:none) whenever its scene isn't
  // active, so this naturally re-fires the count-up every time the user
  // returns to this scene instead of only the very first visit.
  const inView = useInView(ref, { once: false, margin: "-40px" });
  // Start only when revealed AND in view
  const shouldStart = reveal && inView;

  // Fixed 0.8s, always from 0
  const count = useCountUp(kpi.numericValue, 0.8, shouldStart);

  const displayValue = useMemo(() => {
    if (kpi.numericValue === 0) return kpi.value;
    
    // Determine decimal places from original target numericValue
    const str = kpi.numericValue.toString();
    const dotIdx = str.indexOf('.');
    const decimals = dotIdx === -1 ? 0 : str.length - dotIdx - 1;

    const formattedCount = count.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    return `${kpi.prefix}${formattedCount}${kpi.suffix}`;
  }, [count, kpi]);

  return (
    <motion.div
      ref={ref}
      variants={itemVariants}
      className="rounded-2xl relative overflow-hidden cursor-pointer card-premium"
      style={{
        background: `linear-gradient(135deg, ${kpi.color}35 0%, rgba(10, 18, 14, 0.40) 60%, ${kpi.color}18 100%)`,
        backdropFilter: "blur(18px) saturate(150%)",
        WebkitBackdropFilter: "blur(18px) saturate(150%)",
        border: `1.5px solid ${kpi.color}C0`,
        boxShadow: `0 0 35px ${kpi.color}80, inset 0 0 18px ${kpi.color}45, 0 12px 40px rgba(0,0,0,0.6)`,
      }}
      whileHover={{ 
        y: -4, 
        scale: 1.015, 
        border: `2px solid ${kpi.color}`,
        boxShadow: `0 0 45px ${kpi.color}B8, inset 0 0 24px ${kpi.color}65, 0 16px 48px rgba(0,0,0,0.7)` 
      }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Inner tint */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.18) 100%)` }}
      />
      {/* Dynamic dual color glows inside card */}
      <div
        className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full pointer-events-none opacity-[0.38]"
        style={{ background: kpi.color, filter: "blur(30px)" }}
      />
      <div
        className="absolute -top-10 -left-10 w-28 h-28 rounded-full pointer-events-none opacity-[0.22]"
        style={{ background: kpi.color, filter: "blur(24px)" }}
      />
      {/* Top color accent line */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${kpi.color}A0 50%, transparent 100%)` }}
      />
 
      {/* Content */}
      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            className="p-2 rounded-xl border border-white/30 backdrop-blur-sm"
            style={{
              background: `${kpi.color}35`,
              color: "#ffffff",
              boxShadow: `0 0 18px ${kpi.color}60`,
            }}
            whileHover={{ rotate: 8, scale: 1.12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {kpi.icon}
          </motion.div>
          <div className="w-1.5 h-1.5 rounded-full animate-soft-pulse" style={{ background: kpi.color, boxShadow: `0 0 8px ${kpi.color}` }} />
        </div>
        <p className="text-[28px] font-bold font-outfit leading-none" style={{ color: '#ffffff', textShadow: `0 0 10px ${kpi.color}A0, 0 1px 2px rgba(0,0,0,0.8)` }}>
          {displayValue}
        </p>
        <p className="text-xs mt-2.5 font-bold tracking-wide text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{kpi.label}</p>
        {kpi.sub && <p className="text-[11px] mt-1 font-semibold text-white/80" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{kpi.sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────
export function Dashboard({
  reveal = true,
  dockTargetRef,
  sceneActive = true,
}: {
  reveal?: boolean;
  dockTargetRef?: React.RefObject<HTMLDivElement | null>;
  /** Injected by SceneStage — true only while this scene is the one on
   *  stage. Combined with `reveal`, this is what lets the KPI grid replay
   *  its rise-from-the-field entrance every time the user navigates back
   *  here, not just the very first time. */
  sceneActive?: boolean;
}) {
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const shouldReveal = reveal && sceneActive;

  // The very first reveal waits out the intro's hero-text travel (~1.45s);
  // every later revisit uses the shorter camera-synced delay instead.
  const hasRevealedOnceRef = useRef(false);
  useEffect(() => {
    if (shouldReveal) hasRevealedOnceRef.current = true;
  }, [shouldReveal]);
  const kpiContainerVariants = useMemo(
    () => makeContainerVariants(hasRevealedOnceRef.current ? ENTER_DELAY_S : 1.45),
    [shouldReveal]
  );

  useEffect(() => {
    let cancelled = false;
    getSummary()
      .then(d => { if (!cancelled) setSummary(d); })
      .catch(() => { /* KPI cards just stay at 0 if the API isn't reachable */ });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => ({
    kpi: {
      totalFarmers: summary?.totalFarmers ?? 0,
      totalAcreage: Math.round(summary?.totalAcres ?? 0),
      avgYield: summary?.avgYield ?? 0,
      avgN: summary?.avgNitrogen ?? 0,
      pctRatoon: summary?.ratoonPct ?? 0,
      pctPlant: summary?.plantCropPct ?? 0,
      pctNormal: summary?.normalYearPct ?? 0,
      pctStressed: summary?.stressedYearPct ?? 0,
    },
  }), [summary]);

  const kpis: KPIData[] = [
    {
      label: "Total Farmers",
      value: nf.format(stats.kpi.totalFarmers),
      numericValue: stats.kpi.totalFarmers,
      prefix: "", suffix: "",
      icon: <Users size={19} />, color: C.g3,
    },
    {
      label: "Total Acreage",
      value: `${nf.format(stats.kpi.totalAcreage)} ac`,
      numericValue: stats.kpi.totalAcreage,
      prefix: "", suffix: " ac",
      icon: <MapPin size={19} />, color: C.amber,
    },
    {
      label: "Average Yield",
      value: `${stats.kpi.avgYield} t/ha`,
      numericValue: stats.kpi.avgYield,
      prefix: "", suffix: " t/ha",
      icon: <TrendingUp size={19} />, color: C.g4,
    },
    {
      label: "Avg Nitrogen",
      value: `${stats.kpi.avgN} kg/ha`,
      numericValue: stats.kpi.avgN,
      prefix: "", suffix: " kg",
      icon: <FlaskConical size={19} />, color: C.coral,
    },
    {
      label: "Crop Split",
      value: `${stats.kpi.pctRatoon}% Ratoon`,
      numericValue: stats.kpi.pctRatoon,
      prefix: "", suffix: "% Ratoon",
      icon: <Leaf size={19} />, color: C.sky,
      sub: `${stats.kpi.pctPlant}% Plant Crop`,
    },
    {
      label: "Climate Impact",
      value: `${stats.kpi.pctStressed}% Stressed`,
      numericValue: stats.kpi.pctStressed,
      prefix: "", suffix: "% Stressed",
      icon: <CloudSun size={19} />, color: C.slate,
      sub: `${stats.kpi.pctNormal}% Normal Year`,
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full pt-8 pb-16">
      {/* ── Header — the traveling hero text from the intro docks here.
          The div below is an invisible anchor: it reserves layout space and
          gives HeroTravelText a target rect to measure and land on. The
          visible text itself lives in that persistent, fixed-position node,
          not here — this keeps it the same DOM element throughout. ── */}
      <div className="mb-10 flex items-end justify-between">
        <div ref={dockTargetRef} style={{ minHeight: 88 }} />
        {/* Live indicator */}
        <motion.div
          className="flex items-center gap-2 text-[11px] mb-1"
          style={{ color: 'var(--muted-foreground)' }}
          initial={{ opacity: 0 }}
          animate={reveal ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 1.0 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#52B788] animate-soft-pulse" />
          Live
        </motion.div>
      </div>

      {/* ── KPI Bento Grid ── */}
      <motion.section
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10"
        style={{ transformPerspective: 1000 }}
        variants={kpiContainerVariants}
        initial="hidden"
        animate={shouldReveal ? "visible" : "hidden"}
      >
        {kpis.map((k, i) => (
          <AnimatedKPICard key={i} kpi={k} index={i} reveal={shouldReveal} />
        ))}
      </motion.section>
    </div>
  );
}
