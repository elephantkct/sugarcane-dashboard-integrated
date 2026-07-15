import { ReactNode, useEffect, useRef } from "react";
import { motion } from "motion/react";

export const SCENE_TRANSITION_SECONDS = 0.85;

const EASE = [0.16, 1, 0.3, 1] as const;

// Depth-travel tuning — the dominant motion is Z (camera push) + scale +
// blur + opacity; vertical drift is kept deliberately small so it never
// reads as a page-slide. Exiting and entering scenes are asymmetric on
// purpose: leaving is a gentle recede, arriving is a more pronounced
// emergence from deeper in the field, so the two never feel identical.
const PERSPECTIVE = 1000; // px — per-element CSS perspective for translateZ to read as depth
const Z_EXIT = -90; // px — how far the outgoing scene sinks away from camera
const Z_ENTER_START = -150; // px — how deep the incoming scene starts, before approaching
const SCALE_EXIT = 0.96;
const SCALE_ENTER_START = 0.93;
const BLUR_EXIT = 4; // px
const BLUR_ENTER_START = 8; // px
const Y_OFFSET = 16; // px — minimal vertical drift, secondary to depth/scale/opacity

export interface SceneDef {
  id: string;
  node: ReactNode;
}

interface SceneStageProps {
  scenes: SceneDef[];
  activeIndex: number;
  /** The scene that was active before the current transition — stays on
   *  stage (fading out) until the transition finishes, then collapses back
   *  to equal activeIndex. */
  prevIndex: number;
}

export function SceneStage({ scenes, activeIndex, prevIndex }: SceneStageProps) {
  // A scene that was `display:none` (never yet visited, or resting between
  // visits) can contain size-sensitive third-party widgets — Leaflet tiles,
  // recharts' ResponsiveContainer — that measured themselves at 0x0 while
  // hidden and never got a signal to re-measure once shown. Both libraries
  // already know how to recover on a window "resize" event (Leaflet
  // natively, recharts via its own listener), so nudge one right as a scene
  // comes on stage instead of reaching into those components directly.
  const prevActiveRef = useRef(activeIndex);
  useEffect(() => {
    if (prevActiveRef.current === activeIndex) return;
    prevActiveRef.current = activeIndex;

    const fire = () => window.dispatchEvent(new Event("resize"));
    const raf = requestAnimationFrame(fire);
    const settleTimer = setTimeout(fire, SCENE_TRANSITION_SECONDS * 1000 + 80);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settleTimer);
    };
  }, [activeIndex]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {scenes.map((scene, i) => {
        const isActive = i === activeIndex;
        const isExiting = i === prevIndex && i !== activeIndex;
        const onStage = isActive || isExiting;
        const dir = Math.sign(i - activeIndex) || 1;

        return (
          <motion.div
            key={scene.id}
            id={`section-${scene.id}`}
            animate={{
              opacity: isActive ? 1 : 0,
              y: isActive ? 0 : dir * Y_OFFSET,
              z: isActive ? 0 : isExiting ? Z_EXIT : Z_ENTER_START,
              scale: isActive ? 1 : isExiting ? SCALE_EXIT : SCALE_ENTER_START,
              filter: isActive ? "blur(0px)" : `blur(${isExiting ? BLUR_EXIT : BLUR_ENTER_START}px)`,
            }}
            transition={{ duration: SCENE_TRANSITION_SECONDS, ease: EASE }}
            style={{
              position: "absolute",
              inset: 0,
              overflowY: "auto",
              overflowX: "hidden",
              paddingTop: 80, // clearance for the fixed top nav (56px nav + 24px breathing)
              zIndex: isActive ? 2 : 1,
              pointerEvents: isActive ? "auto" : "none",
              transformPerspective: PERSPECTIVE,
              // Scenes fully at rest (neither active nor mid-exit) are
              // display:none — this keeps every page's component instance
              // permanently mounted (same data-fetch-once behavior as
              // before), while removing it from layout/paint AND from the
              // geometry each page's chart-reveal (useInView) hooks rely
              // on, so a scene's charts only ever animate in the first
              // time it's actually visited, exactly as they did when this
              // was a scrolling page.
              display: onStage ? "block" : "none",
              willChange: "transform, opacity, filter",
            }}
          >
            {scene.node}
          </motion.div>
        );
      })}
    </div>
  );
}
