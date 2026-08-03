import { motion, useReducedMotion } from "motion/react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/theme";

const TRACK_W = 52;
const TRACK_H = 26;
const PAD = 3;
const THUMB = TRACK_H - PAD * 2;
const TRAVEL = TRACK_W - THUMB - PAD * 2;

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const reduceMotion = useReducedMotion();

  return (
    <button
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative shrink-0"
      style={{
        width: TRACK_W,
        height: TRACK_H,
        borderRadius: 999,
        background: isDark
          ? "linear-gradient(180deg, #1D2420 0%, #171E1A 100%)"
          : "linear-gradient(180deg, #FFFFFF 0%, #F1F3EC 100%)",
        border: "1px solid var(--hairline)",
        boxShadow: isDark
          ? "inset 0 1px 3px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.03), 0 1px 2px rgba(0,0,0,0.25)"
          : "inset 0 1px 2px rgba(43,52,34,0.10), inset 0 0 0 1px rgba(255,255,255,0.6), 0 1px 2px rgba(43,52,34,0.06)",
        transition: "background 0.3s ease-in-out, box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out",
      }}
    >
      {/* Sliding thumb — spring position + a brief squash/stretch while it
          travels. Rendered *behind* the icons below so whichever icon it
          parks under stays visible on top of it, instead of being covered. */}
      <motion.span
        className="absolute rounded-full pointer-events-none"
        style={{
          top: PAD,
          left: PAD,
          width: THUMB,
          height: THUMB,
          background: isDark
            ? "linear-gradient(155deg, #333D35 0%, #1A211D 100%)"
            : "linear-gradient(155deg, #FFFFFF 0%, #F1EEE6 100%)",
          boxShadow: isDark
            ? "0 1px 3px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 1px 3px rgba(43,52,34,0.28), 0 0 0 1px rgba(255,255,255,0.7)",
        }}
        animate={
          reduceMotion
            ? { x: isDark ? TRAVEL : 0 }
            : { x: isDark ? TRAVEL : 0, scaleX: [1, 1.22, 1], scaleY: [1, 0.85, 1] }
        }
        transition={
          reduceMotion
            ? { duration: 0.15 }
            : {
                x: { type: "spring", stiffness: 180, damping: 20, mass: 1 },
                scaleX: { duration: 0.38, ease: "easeInOut" },
                scaleY: { duration: 0.38, ease: "easeInOut" },
              }
        }
      />

      {/* Track icons — always both present; the inactive one just dims */}
      <Sun
        size={13}
        strokeWidth={2}
        className="absolute top-1/2"
        style={{
          left: PAD + 2,
          transform: "translateY(-50%)",
          color: isDark ? "var(--ink)" : "var(--gold)",
          opacity: isDark ? 0.35 : 1,
          transition: "opacity 0.3s ease-in-out, color 0.3s ease-in-out",
        }}
      />
      <Moon
        size={12}
        strokeWidth={2}
        className="absolute top-1/2"
        style={{
          right: PAD + 2,
          transform: "translateY(-50%)",
          color: isDark ? "var(--gold-soft)" : "var(--ink)",
          opacity: isDark ? 1 : 0.35,
          transition: "opacity 0.3s ease-in-out, color 0.3s ease-in-out",
        }}
      />
    </button>
  );
}
