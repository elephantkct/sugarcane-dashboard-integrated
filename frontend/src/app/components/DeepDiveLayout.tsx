import React, { useRef, useEffect, useState, useMemo } from "react";
import { motion, useInView, animate } from "motion/react";
import { ENTER_DELAY_S, ENTER_STAGGER_S, CONTENT_DURATION_S } from "./SceneStage";

const nfLocal = new Intl.NumberFormat("en-IN");

const EASE_ENTER = [0.45, 0, 0.55, 1] as const; // matches the background camera's own easing

// ── Emerge-from-field choreography ──────────────────────────────────
// Single-block sections (header, table) rise as one unit; multi-item
// sections (charts grid, KPI column) are pure stagger conduits — no visual
// style of their own — so their individual children (Card / KPICard, which
// carry the actual z/blur/scale motion) can arrive one after another. Every
// element's own travel takes CONTENT_DURATION_S — the same span the camera
// spends moving — so section and camera arrive together instead of the
// content just fading in near the end of the camera's move.
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
      // Blur is real but brief — it resolves early (cheap, short-lived
      // repaint) while the GPU-only transform keeps gliding for the rest of
      // the journey, so the expensive part of the animation stays short.
      filter: { duration: CONTENT_DURATION_S * 0.35, ease: EASE_ENTER },
      opacity: { duration: 0.4, delay: CONTENT_DURATION_S - 0.45 },
    },
  },
};

const chartsContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: ENTER_STAGGER_S } },
};

// Individual chart Card / KPI card — the pronounced "rising out of the
// sugarcane" motion: deep-z + blurred + small → sharp, full size, at rest,
// traveling the same distance and duration as the camera. Opacity arrives
// last, as a finishing touch rather than tracking linearly.
const itemRiseVariants = {
  hidden: { opacity: 0, y: 24, z: -200, scale: 0.86, filter: "blur(13px)" },
  visible: {
    opacity: 1, y: 0, z: 0, scale: 1, filter: "blur(0px)",
    transition: {
      default: { duration: CONTENT_DURATION_S, ease: EASE_ENTER },
      filter: { duration: CONTENT_DURATION_S * 0.35, ease: EASE_ENTER },
      opacity: { duration: 0.4, delay: CONTENT_DURATION_S - 0.45 },
    },
  },
};

// ── Number counter hook ────────────────────────────────────────────────
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

// ── Extract numeric value (e.g. "-14" or "85.2 t/ha") ───────────────────
function parseNumeric(val: string | number): { numeric: number; prefix: string; suffix: string; isNegative: boolean } {
  if (typeof val === "number") return { numeric: val, prefix: "", suffix: "", isNegative: val < 0 };
  const match = val.match(/^([^0-9\-]*)(-?)([0-9,]+\.?[0-9]*)(.*)$/);
  if (match) {
    const isNegative = match[2] === "-";
    return {
      prefix: match[1],
      numeric: isNegative
        ? -parseFloat(match[3].replace(/,/g, ""))
        : parseFloat(match[3].replace(/,/g, "")),
      suffix: match[4],
      isNegative,
    };
  }
  return { numeric: 0, prefix: "", suffix: "", isNegative: false };
}

// ── Card ────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <motion.div
      className={`rounded-2xl overflow-hidden flex flex-col relative bg-card shadow-sm ${className}`}
      variants={itemRiseVariants}
      style={{
        border: "1px solid var(--border)",
      }}
      whileHover={{ 
        y: -3, 
        border: "1px solid var(--primary)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.12)" 
      }}
    >
      {title && (
        <div className="px-5 py-4 border-b shrink-0 bg-muted/30"
          style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-semibold font-outfit tracking-wide text-sm" style={{ color: 'var(--foreground)' }}>{title}</h3>
        </div>
      )}
      <div className="p-5 flex-1">{children}</div>
    </motion.div>
  );
}

// ── KPI Card (with animated counter) ───────────────────────────────
export function KPICard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // once:false — this card's column is display:none whenever its scene isn't
  // active, so this naturally re-fires the count-up every time the user
  // returns instead of only the very first visit.
  const inView = useInView(ref, { once: false, margin: "-30px" });

  const { numeric, prefix, suffix } = parseNumeric(value);
  const isNumeric = numeric !== 0;

  // Fixed 0.8s, always from 0
  const counted = useCountUp(numeric, 0.8, inView && isNumeric);

  const displayVal = useMemo(() => {
    if (!isNumeric) return value.toString();

    // Determine decimal places from original parsed numeric value
    const str = numeric.toString();
    const dotIdx = str.indexOf('.');
    const decimals = dotIdx === -1 ? 0 : str.length - dotIdx - 1;

    return `${prefix}${counted.toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  }, [counted, numeric, prefix, suffix, isNumeric, value]);

  return (
    <motion.div
      ref={ref}
      className="rounded-2xl relative overflow-hidden cursor-pointer bg-card shadow-sm"
      variants={itemRiseVariants}
      style={{
        border: "1px solid var(--border)",
      }}
      whileHover={{ 
        y: -4, 
        scale: 1.015, 
        backgroundColor: "var(--card)",
        border: "1px solid var(--primary)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
      }}
    >
      {/* Inner tint gradient */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/40 to-transparent" />

      <div className="relative z-10 p-5">
        <motion.div
          className="p-2 rounded-xl border border-border inline-flex mb-3 bg-muted shadow-sm"
          style={{ color: color }}
          whileHover={{ rotate: 8, scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
        <p className="text-[26px] font-bold font-outfit leading-none text-foreground drop-shadow-sm">
          {displayVal}
        </p>
        <p className="text-xs font-bold tracking-wide text-muted-foreground mt-2.5">{label}</p>
        {sub && <p className="text-[11px] font-semibold text-muted-foreground mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Deep Dive Layout ──────────────────────────────────────────────
export function DeepDiveLayout({
  charts,
  table,
  kpis,
  title,
  sceneActive = true,
}: {
  charts: React.ReactNode;
  table: React.ReactNode;
  kpis: React.ReactNode;
  title: string;
  /** Injected by SceneStage (via the page component) — true only while this
   *  scene is the one on stage. Drives the whole layout's rise-from-the-field
   *  entrance, replayed every time the user navigates back here. */
  sceneActive?: boolean;
}) {
  return (
    <motion.div
      className="p-4 md:p-8 max-w-[1400px] mx-auto w-full h-full flex flex-col pt-8 pb-16"
      variants={pageStaggerVariants}
      initial="hidden"
      animate={sceneActive ? "visible" : "hidden"}
    >
      {/* ── Header ── */}
      <motion.header className="mb-6 shrink-0 on-video-text" variants={sectionRiseVariants} style={{ transformPerspective: 1000 }}>
        <p className="text-[10px] uppercase tracking-[0.25em] mb-1.5 font-medium" style={{ color: 'var(--muted-foreground)' }}>
          Deep Dive
        </p>
        <h1
          className="text-3xl font-bold font-outfit"
          style={{ color: 'var(--foreground)' }}
        >
          {title}
        </h1>
      </motion.header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* ── Left Column ── */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {charts && (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 shrink-0"
              variants={chartsContainerVariants}
              style={{ transformPerspective: 1000 }}
            >
              {charts}
            </motion.div>
          )}
          <motion.div className="flex-1 min-h-0" variants={sectionRiseVariants} style={{ transformPerspective: 1000 }}>
            {table}
          </motion.div>
        </div>

        {/* ── Right Column — KPIs ── */}
        <motion.div
          className="w-full lg:w-72 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1 pb-8"
          variants={chartsContainerVariants}
          style={{ transformPerspective: 1000 }}
        >
          <h3 className="font-semibold uppercase tracking-widest text-[10px] mb-1 px-1" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
            Key Insights
          </h3>
          {kpis}
        </motion.div>
      </div>
    </motion.div>
  );
}
