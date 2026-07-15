import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useLayoutEffect, useCallback, RefObject } from "react";
import { motion } from "motion/react";
import gsap from "gsap";

export interface HeroTravelTextHandle {
  /** Begin the magic-move journey from the intro spot to the dashboard header dock. */
  startTravel: () => void;
}

interface HeroTravelTextProps {
  /** True once the intro video has decoded its first frame — gates the entrance animation. */
  ready: boolean;
  /** Ref to the invisible placeholder inside the Dashboard header this text should dock onto. */
  dockTargetRef: RefObject<HTMLDivElement | null>;
  /** Skip the journey entirely and render already docked — used when the intro was
   *  already played earlier this session, so there's nothing left to travel from. */
  startDocked?: boolean;
  /** True while the Main Dashboard scene is the one on stage. Once docked, the
   *  hero text is dashboard-header content — it fades out with the rest of
   *  that scene when the user navigates to a different scene, and fades back
   *  in when they return, matching the scene-stage transition treatment. */
  dashboardSceneActive: boolean;
}

// Final scale applied once the hero text has docked into the dashboard header —
// ~65-70% of its intro size per the design brief, preserving the exact same
// typography and DOM node, just settled into a smaller footprint.
const DOCK_SCALE = 0.68;

export const HeroTravelText = forwardRef<HeroTravelTextHandle, HeroTravelTextProps>(
  ({ ready, dockTargetRef, startDocked, dashboardSceneActive }, ref) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const hasTraveledRef = useRef(false);
    const [docked, setDocked] = useState(false);
    const dockedDocTopRef = useRef(0);

    // Returning visitors within the same session skip the intro entirely —
    // land the hero text directly in its dashboard-header dock, no journey.
    // useLayoutEffect so it's positioned before first paint (no flash at the
    // intro's bottom-left spot).
    useLayoutEffect(() => {
      if (!startDocked || hasTraveledRef.current) return;
      const wrapper = wrapperRef.current;
      const dockEl = dockTargetRef.current;
      if (!wrapper || !dockEl) return;
      hasTraveledRef.current = true;

      const rect = dockEl.getBoundingClientRect();
      dockedDocTopRef.current = rect.top + window.scrollY;
      wrapper.style.left = `${rect.left}px`;
      wrapper.style.bottom = "auto";
      wrapper.style.top = `${rect.top}px`;
      wrapper.style.transform = `scale(${DOCK_SCALE})`;
      wrapper.style.zIndex = "10";
      setDocked(true);
    }, [startDocked, dockTargetRef]);

    const startTravel = useCallback(() => {
      if (hasTraveledRef.current) return;
      const wrapper = wrapperRef.current;
      const dockEl = dockTargetRef.current;
      if (!wrapper || !dockEl) return;
      hasTraveledRef.current = true;

      const fromRect = wrapper.getBoundingClientRect();
      const toRect = dockEl.getBoundingClientRect();
      const dx = toRect.left - fromRect.left;
      const dy = toRect.top - fromRect.top;

      const state = { x: 0, y: 0, scale: 1 };
      const applyTransform = () => {
        wrapper.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale})`;
      };

      const tl = gsap.timeline({
        onComplete: () => {
          // Hand off from transform-driven flight to a scroll-anchored dock:
          // freeze the settled viewport position, then track scroll manually
          // so the text behaves like a normal in-page header from here on.
          const settledRect = wrapper.getBoundingClientRect();
          dockedDocTopRef.current = settledRect.top + window.scrollY;
          wrapper.style.left = `${settledRect.left}px`;
          wrapper.style.bottom = "auto";
          wrapper.style.top = `${settledRect.top}px`;
          wrapper.style.transform = `scale(${DOCK_SCALE})`;
          wrapper.style.zIndex = "10";
          setDocked(true);
        },
      });

      // Phase 1 — the bulk of the journey, unhurried and weighted.
      tl.to(state, {
        x: dx * 0.94,
        y: dy * 0.94,
        scale: 1 - (1 - DOCK_SCALE) * 0.9,
        duration: 3.6,
        ease: "power2.inOut",
        onUpdate: applyTransform,
      });
      // Phase 2 — a soft, floating settle into the dock.
      tl.to(state, {
        x: dx,
        y: dy,
        scale: DOCK_SCALE,
        duration: 0.7,
        ease: "power2.out",
        onUpdate: applyTransform,
      });
    }, [dockTargetRef]);

    useImperativeHandle(ref, () => ({ startTravel }), [startTravel]);

    // Once docked, keep the (still position:fixed) node glued to its document
    // position by continuously re-deriving its viewport offset from scrollY —
    // this makes it scroll away with the rest of the page exactly like a
    // normal static header, without ever re-parenting or recreating the node.
    useEffect(() => {
      if (!docked) return;
      const wrapper = wrapperRef.current;
      const dockEl = dockTargetRef.current;
      if (!wrapper) return;

      const update = () => {
        wrapper.style.top = `${dockedDocTopRef.current - window.scrollY}px`;
      };
      const handleResize = () => {
        // Re-measure so the dock stays correct across responsive reflows.
        if (dockEl) {
          const rect = dockEl.getBoundingClientRect();
          dockedDocTopRef.current = rect.top + window.scrollY;
          wrapper.style.left = `${rect.left}px`;
        }
        update();
      };

      update();
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("scroll", update);
        window.removeEventListener("resize", handleResize);
      };
    }, [docked, dockTargetRef]);

    return (
      <div
        ref={wrapperRef}
        className="on-video-text"
        style={{
          position: "fixed",
          left: "10%",
          bottom: "15%",
          maxWidth: "800px",
          textAlign: "left",
          pointerEvents: "none",
          zIndex: 1000,
          transformOrigin: "0 0",
        }}
      >
        <motion.div
          initial={startDocked ? false : "hidden"}
          animate={!ready ? "hidden" : docked && !dashboardSceneActive ? "dimmed" : "visible"}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15,
                delayChildren: 0.15,
              },
            },
            dimmed: {
              opacity: 0,
              transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
            },
          }}
        >
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 14 },
              visible: { opacity: 0.5, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
            }}
            style={{
              fontFamily: "Outfit, sans-serif",
              fontWeight: 400,
              fontSize: "0.85rem",
              letterSpacing: "0.45em",
              color: "#95D5B2",
              textTransform: "uppercase",
              marginBottom: "0.75rem",
            }}
          >
            Environmental Defense Fund
          </motion.p>
          <motion.h1
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] } },
            }}
            style={{
              fontFamily: "Outfit, sans-serif",
              fontWeight: 300,
              fontSize: "3.2rem",
              letterSpacing: "-0.01em",
              color: "#ffffff",
              lineHeight: "1.15",
              marginBottom: "0.75rem",
            }}
          >
            Sugarcane Analytics Platform
          </motion.h1>
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 14 },
              visible: { opacity: 0.6, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
            }}
            style={{
              fontFamily: "Outfit, sans-serif",
              fontWeight: 300,
              fontSize: "1.1rem",
              letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Data-driven Agricultural Intelligence
          </motion.p>
        </motion.div>
      </div>
    );
  }
);

HeroTravelText.displayName = "HeroTravelText";
