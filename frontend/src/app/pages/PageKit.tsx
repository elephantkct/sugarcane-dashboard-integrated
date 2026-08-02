import { motion, useReducedMotion } from "motion/react";

export const nf = new Intl.NumberFormat("en-IN");

export const CHART_COLORS = ["var(--olive)", "var(--gold-soft)", "var(--clay-soft)", "var(--sage)", "var(--steel)"];

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  kpis,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  kpis?: { value: string; label: string }[];
}) {
  return (
    <div className="mb-2">
      <p className="eyebrow mb-1">{eyebrow}</p>
      <h1 className="text-[26px] font-semibold" style={{ color: "var(--ink)" }}>{title}</h1>
      <p className="text-[13px] mt-1 max-w-2xl" style={{ color: "var(--ink)", opacity: 0.6 }}>{subtitle}</p>
      {kpis && (
        <div className="flex flex-wrap gap-x-8 gap-y-1 mt-4">
          {kpis.map((k) => (
            <div key={k.label}>
              <div className="kpi-number" style={{ fontSize: 22 }}>{k.value}</div>
              <p className="text-[11px]" style={{ color: "var(--ink)", opacity: 0.55 }}>{k.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function KPITile({
  value, unit, label, delay = 0, icon,
}: {
  value: string | number; unit?: string; label: string; delay?: number; icon?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduceMotion ? 0 : delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-master p-5"
    >
      {icon && <div className="mb-3" style={{ color: "var(--gold)" }}>{icon}</div>}
      <div className="kpi-number">
        {value}
        {unit && <span className="kpi-number-unit">{unit}</span>}
      </div>
      <p className="text-[12px] mt-1.5" style={{ color: "var(--ink)", opacity: 0.55 }}>{label}</p>
    </motion.div>
  );
}

export function ChartCard({
  title,
  subtitle,
  legend,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  legend?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-card-master p-5 flex flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>{title}</h3>
          {subtitle && <p className="text-[12px] mt-0.5" style={{ color: "var(--ink)", opacity: 0.55 }}>{subtitle}</p>}
        </div>
        {legend}
      </div>
      {/* role="img" + aria-label give screen readers a text summary of the chart, since the
          underlying SVG (Recharts) has no accessible text content of its own. */}
      <div className="flex-1 min-h-0 mt-2" role="img" aria-label={`${title}${subtitle ? ": " + subtitle : ""} chart`}>
        {children}
      </div>
    </div>
  );
}

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border p-3 rounded-lg shadow-lg text-xs" style={{ borderColor: "var(--hairline)" }}>
      {label && <p className="font-semibold mb-1.5" style={{ color: "var(--ink)" }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-3 justify-between">
          <span style={{ color: p.color || p.fill }}>{p.name}</span>
          <strong style={{ color: "var(--ink)" }}>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export const axisTick = { fill: "var(--ink)", fontSize: 10, opacity: 0.45 };
export const axisTickSm = { fill: "var(--ink)", fontSize: 9, opacity: 0.45 };

export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}
