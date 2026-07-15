import {
  LayoutDashboard, Map as MapIcon, BarChart3, TrendingUp, Users,
  Sprout, Droplets, Leaf, CloudSun, FlaskConical,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type SectionId =
  | "dashboard" | "map" | "analytics" | "yield" | "identity"
  | "land" | "fertilizer" | "ratoon" | "climate" | "long_tail_fert" | "long_tail_org";

export const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard",      label: "Main Dashboard",      icon: <LayoutDashboard size={14} /> },
  { id: "map",            label: "District Map",         icon: <MapIcon size={14} /> },
  { id: "analytics",      label: "Analytics",            icon: <BarChart3 size={14} /> },
  { id: "yield",          label: "Yield & Nutrition",    icon: <TrendingUp size={14} /> },
  { id: "identity",       label: "Identity & Admin",     icon: <Users size={14} /> },
  { id: "land",           label: "Land Detail",          icon: <Sprout size={14} /> },
  { id: "fertilizer",     label: "Fertilizer Method",    icon: <Droplets size={14} /> },
  { id: "ratoon",         label: "Ratoon Planning",      icon: <Leaf size={14} /> },
  { id: "climate",        label: "Climate Detail",       icon: <CloudSun size={14} /> },
  { id: "long_tail_fert", label: "Long-tail Fertilizers",icon: <FlaskConical size={14} /> },
  { id: "long_tail_org",  label: "Long-tail Organics",   icon: <Leaf size={14} /> },
];

interface TopNavProps {
  visible: boolean;
  /** Which scene is currently on stage — controlled by App's scene navigation. */
  activeSection: SectionId;
  /** Request a jump to a scene; App resolves this into a scene transition. */
  onNavigate: (id: SectionId) => void;
}

export function TopNav({ visible, activeSection, onNavigate }: TopNavProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          id="top-nav"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            background: "var(--glass-elevated-bg)",
            backdropFilter: "var(--glass-elevated-blur)",
            WebkitBackdropFilter: "var(--glass-elevated-blur)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "var(--glass-elevated-shadow)",
          }}
        >
          {/* Inner reflection highlight */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "1px",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 30%, rgba(82,183,136,0.15) 50%, rgba(255,255,255,0.08) 70%, transparent 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              padding: "0 20px",
              height: 56,
              maxWidth: "100%",
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
                paddingRight: 24,
                borderRight: "1px solid rgba(82,183,136,0.12)",
                marginRight: 20,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #2D6A4F 0%, #52B788 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(82,183,136,0.35)",
                  flexShrink: 0,
                }}
              >
                <Leaf size={13} color="white" />
              </div>
              <div style={{ lineHeight: 1 }}>
                <p
                  style={{
                    fontFamily: "Outfit, sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    background:
                      "linear-gradient(to right, #e8f0ea 0%, #52B788 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  EDF Sugarcane
                </p>
                <p
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(122, 173, 138, 0.6)",
                    marginTop: 1,
                  }}
                >
                  Analytics
                </p>
              </div>
            </div>

            {/* Scrollable nav items */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                overflowX: "auto",
                flexShrink: 1,
                minWidth: 0,
                // Hide scrollbar but allow scrolling
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
              className="nav-scroll-container"
            >
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    id={`nav-btn-${section.id}`}
                    onClick={() => onNavigate(section.id)}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid transparent",
                      background: "transparent",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      fontSize: 12.5,
                      fontFamily: "Inter, system-ui, sans-serif",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "#52B788" : "rgba(181, 214, 191, 0.65)",
                      transition:
                        "color 0.2s ease, background 0.2s ease, border-color 0.2s ease",
                      ...(isActive
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(82,183,136,0.12) 0%, rgba(82,183,136,0.04) 100%)",
                            borderColor: "rgba(255, 255, 255, 0.10)",
                            boxShadow:
                              "0 0 12px rgba(82,183,136,0.05), inset 0 1px 0 rgba(255,255,255,0.06)",
                          }
                        : {}),
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "rgba(181, 214, 191, 0.9)";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(255,255,255,0.04)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "rgba(181, 214, 191, 0.65)";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "transparent";
                      }
                    }}
                  >
                    {/* Active bottom indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-indicator"
                        style={{
                          position: "absolute",
                          bottom: -1,
                          left: "20%",
                          right: "20%",
                          height: 2,
                          borderRadius: 99,
                          background:
                            "linear-gradient(90deg, #52B788 0%, #74C69D 100%)",
                          boxShadow: "0 0 8px rgba(82,183,136,0.4)",
                        }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      />
                    )}

                    {/* Icon */}
                    <span
                      style={{
                        color: isActive ? "#52B788" : "rgba(122,173,138,0.7)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {section.icon}
                    </span>

                    {/* Label */}
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
