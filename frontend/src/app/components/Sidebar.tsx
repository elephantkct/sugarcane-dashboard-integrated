import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  LayoutDashboard, MapPin, FlaskConical, TrendingUp,
  Users, Layers, CloudSun, Settings,
} from "lucide-react";

export type PageId =
  | "overview"
  | "district_map"
  | "yield_nutrition"
  | "identity_admin"
  | "land_details"
  | "fertilizer_method"
  | "climate_details";

export const PAGES: { id: PageId; label: string; icon: React.ReactNode; group: string }[] = [
  { id: "overview",          label: "Overview",         icon: <LayoutDashboard size={18} />, group: "OVERVIEW" },
  { id: "district_map",      label: "District Map",     icon: <MapPin size={18} />,          group: "SURVEY ANALYTICS" },
  { id: "yield_nutrition",   label: "Yield & Nutrition", icon: <TrendingUp size={18} />,      group: "DEEP DIVE" },
  { id: "identity_admin",    label: "Identity & Admin",  icon: <Users size={18} />,           group: "DEEP DIVE" },
  { id: "land_details",      label: "Land Details",      icon: <Layers size={18} />,          group: "DEEP DIVE" },
  { id: "fertilizer_method", label: "Fertilizer Method", icon: <FlaskConical size={18} />,    group: "DEEP DIVE" },
  { id: "climate_details",   label: "Climate Details",   icon: <CloudSun size={18} />,        group: "DEEP DIVE" },
];

/** Page titles shown in the top bar — mirrors the spec's per-page header copy. */
export const PAGE_TITLES: Record<PageId, string> = {
  overview: "Main Dashboard",
  district_map: "District Map",
  yield_nutrition: "Yield & Nutrition",
  identity_admin: "Identity & Admin",
  land_details: "Land Detail",
  fertilizer_method: "Fertilizer Method",
  climate_details: "Climate Detail",
};

const GROUP_ORDER = ["OVERVIEW", "SURVEY ANALYTICS", "DEEP DIVE"];

const RAIL_COLLAPSED = 64;
const RAIL_EXPANDED = 220;

export function Sidebar({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (id: PageId) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <motion.aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col overflow-hidden"
      style={{ background: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      animate={{ width: hovered ? RAIL_EXPANDED : RAIL_COLLAPSED }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
    >
      <nav className="flex-1 overflow-y-auto no-scrollbar pt-5 px-3 space-y-6">
        {GROUP_ORDER.map((group) => (
          <div key={group}>
            <AnimatePresence>
              {hovered && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.15 }}
                  className="eyebrow px-2 mb-1.5 whitespace-nowrap"
                >
                  {group}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-1">
              {PAGES.filter((p) => p.group === group).map((page) => {
                const isActive = activePage === page.id;
                return (
                  <button
                    key={page.id}
                    onClick={() => onNavigate(page.id)}
                    aria-label={page.label}
                    aria-current={isActive ? "page" : undefined}
                    className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors"
                    style={{
                      background: isActive ? "var(--sidebar-accent)" : "transparent",
                      color: isActive ? "var(--ink)" : "var(--ink)",
                      opacity: isActive ? 1 : 0.55,
                    }}
                  >
                    <span className="shrink-0">{page.icon}</span>
                    {hovered && (
                      <span className="text-[13px] font-medium truncate whitespace-nowrap">
                        {page.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-3 space-y-1" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <button
          aria-label="Settings"
          className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors"
          style={{ color: "var(--ink)", opacity: 0.55 }}
        >
          <Settings size={18} className="shrink-0" />
          {hovered && <span className="text-[13px] font-medium whitespace-nowrap">Settings</span>}
        </button>
        <div className="flex items-center gap-3 px-2.5 py-2">
          <div
            className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-semibold"
            style={{ background: "var(--gold-soft)", color: "var(--ink)" }}
          >
            EA
          </div>
          {hovered && <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: "var(--ink)" }}>EDF Agronomist</span>}
        </div>
      </div>
    </motion.aside>
  );
}

/** Bottom tab bar shown under 768px, replacing the icon rail. */
export function BottomTabBar({
  activePage,
  onNavigate,
}: {
  activePage: PageId;
  onNavigate: (id: PageId) => void;
}) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto no-scrollbar"
      style={{ background: "var(--surface)", borderTop: "1px solid var(--hairline)" }}
      aria-label="Page navigation"
    >
      {PAGES.map((page) => {
        const isActive = activePage === page.id;
        return (
          <button
            key={page.id}
            onClick={() => onNavigate(page.id)}
            aria-label={page.label}
            aria-current={isActive ? "page" : undefined}
            className="flex flex-col items-center justify-center gap-1 py-2 px-3 shrink-0 min-w-[64px]"
            style={{ color: "var(--ink)", opacity: isActive ? 1 : 0.5 }}
          >
            {page.icon}
            <span className="text-[9px] font-medium whitespace-nowrap">{page.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
