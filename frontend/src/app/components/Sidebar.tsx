import { useRef, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Map, Users, Sprout, Droplets,
  FlaskConical, Leaf, CloudSun, TrendingUp, BarChart3,
} from "lucide-react";

export type PageId =
  | "dashboard" | "map" | "analytics" | "yield" | "identity"
  | "land" | "fertilizer" | "ratoon" | "climate" | "long_tail_fert" | "long_tail_org";

export const PAGES: { id: PageId; label: string; icon: React.ReactNode; group: string }[] = [
  { id: "dashboard",      label: "Main Dashboard",      icon: <LayoutDashboard size={16} />, group: "Overview" },
  { id: "map",            label: "District Map",         icon: <Map size={16} />,             group: "Overview" },
  { id: "analytics",      label: "Analytics",            icon: <BarChart3 size={16} />,       group: "Overview" },
  { id: "yield",          label: "Yield & Nutrition",    icon: <TrendingUp size={16} />,      group: "Farmer Data Tables" },
  { id: "identity",       label: "Identity & Admin",     icon: <Users size={16} />,           group: "Farmer Data Tables" },
  { id: "land",           label: "Land Detail",          icon: <Sprout size={16} />,          group: "Farmer Data Tables" },
  { id: "fertilizer",     label: "Fertilizer Method",    icon: <Droplets size={16} />,        group: "Farmer Data Tables" },
  { id: "ratoon",         label: "Ratoon Planning",      icon: <Leaf size={16} />,            group: "Farmer Data Tables" },
  { id: "climate",        label: "Climate Detail",        icon: <CloudSun size={16} />,        group: "Farmer Data Tables" },
  { id: "long_tail_fert", label: "Long-tail Fertilizers",icon: <FlaskConical size={16} />,    group: "Farmer Data Tables" },
  { id: "long_tail_org",  label: "Long-tail Organics",   icon: <Leaf size={16} />,            group: "Farmer Data Tables" },
];

export function Sidebar({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (id: PageId) => void;
}) {
  const groups = Array.from(new Set(PAGES.map((p) => p.group)));

  // Track button refs for the animated indicator
  const btnRefs = useRef<Record<PageId, HTMLButtonElement | null>>({} as any);
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });
  const sidebarRef = useRef<HTMLElement>(null);

  // Measure the active button and position the indicator
  useLayoutEffect(() => {
    const btn = btnRefs.current[activePage];
    const sidebar = sidebarRef.current;
    if (!btn || !sidebar) return;

    const sidebarRect = sidebar.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicatorStyle({
      top: btnRect.top - sidebarRect.top + sidebar.scrollTop,
      height: btnRect.height,
      opacity: 1,
    });
  }, [activePage]);

  return (
    <aside
      ref={sidebarRef}
      className="fixed left-0 top-0 bottom-0 w-64 z-40 overflow-y-auto overflow-x-hidden glass-panel"
      style={{ borderRight: "1px solid var(--sidebar-border)" }}
    >
      {/* ── Animated active indicator ── */}
      <motion.div
        className="absolute left-0 w-[3px] rounded-r-full pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #52B788 0%, #95D5B2 100%)",
          boxShadow: "0 0 8px rgba(82,183,136,0.6)",
        }}
        animate={{
          top: indicatorStyle.top,
          height: indicatorStyle.height,
          opacity: indicatorStyle.opacity,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      />

      {/* ── Logo / Brand ── */}
      <motion.div
        className="p-6 pb-4"
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-2.5 mb-1">
          {/* Leaf icon */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2D6A4F] to-[#52B788] flex items-center justify-center shadow-lg">
            <Leaf size={14} className="text-white" />
          </div>
          <h1
            className="text-[17px] font-bold font-outfit tracking-tight"
            style={{
              background: "linear-gradient(to right, var(--sidebar-foreground) 0%, var(--sidebar-primary) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            EDF Sugarcane
          </h1>
        </div>
        <p className="text-[10px] uppercase tracking-widest ml-[37px]" style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>
          Survey Analytics
        </p>
      </motion.div>

      {/* ── Divider ── */}
      <div className="mx-4 mb-4 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--sidebar-border), transparent)' }} />

      {/* ── Navigation ── */}
      <nav className="px-3 pb-8 space-y-5">
        {groups.map((group, gi) => (
          <motion.div
            key={group}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.1 + gi * 0.08,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <p className="px-3 text-[9.5px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>
              {group}
            </p>
            <div className="space-y-0.5">
              {PAGES.filter((p) => p.group === group).map((page, pi) => {
                const isActive = activePage === page.id;
                return (
                  <motion.button
                    key={page.id}
                    ref={(el) => { btnRefs.current[page.id] = el; }}
                    onClick={() => onNavigate(page.id)}
                    className={`w-full flex items-center gap-3 px-3 py-[9px] rounded-xl text-[13px] text-left relative overflow-hidden
                      transition-colors duration-150 btn-ripple
                      ${isActive
                        ? "font-medium"
                        : "hover:opacity-80"
                      }
                    `}
                    style={{ color: isActive ? 'var(--sidebar-primary)' : 'var(--muted-foreground)' }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: 0.15 + gi * 0.07 + pi * 0.04,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Active background */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-xl sidebar-active-bg"
                          layoutId="sidebar-active-bg"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Icon */}
                    <motion.span
                      className="relative z-10 shrink-0"
                      style={{ color: isActive ? 'var(--sidebar-primary)' : 'inherit' }}
                      whileHover={{ rotate: 5, scale: 1.15 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {page.icon}
                    </motion.span>

                    {/* Label */}
                    <span className="relative z-10 truncate">{page.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </nav>

      {/* ── Bottom decoration ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, var(--sidebar) 0%, transparent 100%)",
        }}
      />
    </aside>
  );
}
