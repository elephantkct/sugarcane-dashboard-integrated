import { ReactNode, cloneElement, isValidElement, useEffect, useRef } from "react";
import { motion } from "motion/react";

// ─────────────────────────────────────────────────────────────────────────────
// Cinematic transition timing — single source of truth shared by App.tsx (which
// drives the background camera + the navigation lock) and every scene's own
// content-reveal stagger (Dashboard, DeepDiveLayout, Map, analytics), so the
// content dissolve, camera travel, and content emergence always stay in
// lockstep no matter which file reads them.
//
// Sequence: content exits (EXIT_S) → the camera AND the next section's content
// start their journey through the field at the same instant, traveling the
// same distance in the same time — so by the time the camera settles, the
// content is arriving at its own resting place too. One physical motion,
// not a background move plus a separate content fade.
// ─────────────────────────────────────────────────────────────────────────────
export const EXIT_S = 0.5;
export const EXIT_MS = EXIT_S * 1000;
// Camera travel time — deliberately slow and cinematic (prioritizing
// smoothness over speed), not a quick snap between sections.
export const CAMERA_MS = 2000;
export const CAMERA_S = CAMERA_MS / 1000;
// Content finishes a touch before the camera fully settles, so it reads as
// "already arriving" rather than "arrived, then waiting".
const CONTENT_LEAD_MS = 200;
export const CONTENT_DURATION_MS = CAMERA_MS - CONTENT_LEAD_MS;
export const CONTENT_DURATION_S = CONTENT_DURATION_MS / 1000;
// Content starts traveling the instant the camera does.
export const ENTER_DELAY_S = EXIT_S;
// Stagger step between sibling groups/cards during the entrance reveal —
// kept small relative to CONTENT_DURATION_S so everything travels together,
// just offset by a beat, rather than reading as a slow relay.
export const ENTER_STAGGER_S = 0.08;
// Buffer past the camera's own settle time — covers the worst case where a
// deeply-nested, late-stagger-slot item (e.g. the last KPI card in a nested
// conduit) finishes its own travel slightly after the camera stops.
export const TOTAL_TRANSITION_MS = EXIT_MS + CAMERA_MS + 450;
export const SCENE_TRANSITION_SECONDS = TOTAL_TRANSITION_MS / 1000;

const EASE_ENTER = [0.45, 0, 0.55, 1] as const; // symmetric ease-in-out — matches the camera's own easing
const EASE_EXIT = [0.4, 0, 1, 1] as const; // ease-in — an accelerating dissolve, not a linear fade

const PERSPECTIVE = 1000; // px — CSS perspective for translateZ to read as camera depth

// The whole-scene wrapper is now just a neutral stage: a quick, cheap
// opacity pass (composite-only, no blur/scale/z, no repaint cost) that gets
// the page ready to receive its content. All the pronounced "traveling
// through the field" motion — the part that must ride in lockstep with the
// camera — lives one level down, in each page's own content items, so
// individual elements (title, KPI cards, charts) can travel the same Z
// distance the camera does instead of the whole page moving as one block.
const sceneVariants = {
  hidden: { opacity: 0 },
  // Only the scene the user is navigating away from gets this — a short,
  // cheap dissolve (opacity + a little downward drift), bounded to EXIT_S so
  // it never overlaps the long camera-synced travel.
  exiting: {
    opacity: 0,
    y: 20,
    transition: { duration: EXIT_S, ease: EASE_EXIT },
  },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: EASE_ENTER },
  },
};

export interface SceneDef {
  id: string;
  node: ReactNode;
}

interface SceneStageProps {
  scenes: SceneDef[];
  activeIndex: number;
  /** The scene that was active before the current transition — stays on
   *  stage (dissolving out) until the transition finishes, then collapses
   *  back to equal activeIndex. */
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
        const state = isActive ? "visible" : isExiting ? "exiting" : "hidden";

        // Inject a live `sceneActive` prop into the (otherwise stable,
        // memoized) scene element — only the two scenes actually involved
        // in a transition see this value flip, so every other memoized
        // page bails out of re-rendering, same as before.
        const content =
          isValidElement(scene.node)
            ? cloneElement(scene.node as React.ReactElement<{ sceneActive?: boolean }>, {
                sceneActive: isActive,
              })
            : scene.node;

        return (
          <motion.div
            key={scene.id}
            id={`section-${scene.id}`}
            variants={sceneVariants}
            initial={false}
            animate={state}
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
              // geometry each page's chart-reveal hooks rely on.
              display: onStage ? "block" : "none",
              // Only pin a compositor layer for panels actually animating
              // (active + exiting) — with all eleven scenes permanently
              // mounted, hinting willChange on all of them at once wastes
              // GPU memory/compositing budget the background video needs.
              willChange: onStage ? "opacity" : "auto",
            }}
          >
            {content}
          </motion.div>
        );
      })}
    </div>
  );
}
