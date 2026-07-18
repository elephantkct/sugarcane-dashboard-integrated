import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";

// ============================================================
// Frame sequence config — must match what you actually extracted.
// ============================================================
const TOTAL_FRAMES = 200;
const FRAME_PATH = (i: number) => `/frames/frame_${String(i).padStart(4, "0")}.jpg`;

// Default travel time for a camera move when the caller doesn't specify one.
const DEFAULT_CAMERA_MS = 2000;

// Same easing as the original — unchanged, this part has nothing to do with
// video vs frames, it's just the shape of the camera move over time.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface ScrollDrivenBackgroundHandle {
  beginReveal: () => void;
  lockAndListen: () => void;
  goToProgress: (progress: number, durationMs?: number) => void;
}

const ScrollDrivenBackground = forwardRef<ScrollDrivenBackgroundHandle, {}>(
  (_props, ref) => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<HTMLImageElement[]>([]);
    const [loadedCount, setLoadedCount] = useState(0);

    // displayFrameRef holds the current interpolated frame position (can be
    // fractional mid-tween, rounded only at draw time) — same role as
    // displayTimeRef in the video version.
    const displayFrameRef = useRef<number>(0);
    const lockedRef = useRef<boolean>(false);

    const tweenFromRef = useRef<number>(0);
    const tweenToRef = useRef<number>(0);
    const tweenStartRef = useRef<number>(0);
    const tweenDurationRef = useRef<number>(DEFAULT_CAMERA_MS);
    const tweenActiveRef = useRef<boolean>(false);

    useImperativeHandle(ref, () => ({
      beginReveal() {
        const wrap = wrapRef.current;
        if (!wrap) return;
        wrap.style.transition = "opacity 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s, transform 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s";
        wrap.style.opacity = "1";
        wrap.style.transform = "perspective(1000px) translateZ(0px) scale(1)";
        // No video to .play() — the canvas is already showing frame 0 by this point.
      },
      lockAndListen() {
        // No decoder to pause — just lock in the current frame as the tween
        // baseline, same role as capturing video.currentTime before.
        tweenFromRef.current = displayFrameRef.current;
        tweenToRef.current = displayFrameRef.current;
        tweenActiveRef.current = false;
        lockedRef.current = true;
      },
      goToProgress(progress: number, durationMs = DEFAULT_CAMERA_MS) {
        const clamped = Math.max(0, Math.min(1, progress));
        tweenFromRef.current = displayFrameRef.current;
        // Full frame range now — the 25% cap from the video version was a
        // decode-cost workaround that no longer applies with pre-rendered frames.
        tweenToRef.current = clamped * (TOTAL_FRAMES - 1);
        tweenStartRef.current = performance.now();
        tweenDurationRef.current = Math.max(1, durationMs);
        tweenActiveRef.current = true;
      },
    }));

    // Preload every frame up front. 200 JPGs at ~25MB total loads quickly on
    // any reasonable connection; if you extend the sequence much further,
    // switch this to a progressive loader instead (load first ~20 immediately,
    // stream the rest in the background).
    useEffect(() => {
      let cancelled = false;
      const images: HTMLImageElement[] = [];

      for (let i = 1; i <= TOTAL_FRAMES; i++) {
        const img = new Image();
        img.src = FRAME_PATH(i);
        img.onload = () => {
          if (!cancelled) setLoadedCount(c => c + 1);
        };
        images.push(img);
      }
      imagesRef.current = images;

      // Draw frame 0 onto the canvas as soon as it's ready, so beginReveal()
      // never has to wait on anything — this mirrors the old code's
      // "force-decode frame 0 before reveal" behavior.
      images[0].onload = () => {
        if (cancelled) return;
        setLoadedCount(c => c + 1);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
          ctx.drawImage(images[0], 0, 0, canvas.width, canvas.height);
        }
      };

      return () => { cancelled = true; };
    }, []);

    // Drive displayFrameRef along the same eased tween as before, but instead
    // of seeking a decoder (expensive, async, can stall), we just draw the
    // matching pre-rendered image to canvas — cheap and synchronous, so all
    // the seek-debouncing/retargeting logic from the video version (SEEK_EPSILON,
    // RETARGET_THRESHOLD, checking video.seeking) is no longer needed at all.
    useEffect(() => {
      let animationFrameId: number;
      let lastDrawnFrame = -1;
      let lastTransform = "";

      const tick = (now: number) => {
        const wrap = wrapRef.current;
        const canvas = canvasRef.current;

        if (lockedRef.current && !document.hidden) {
          if (tweenActiveRef.current) {
            const elapsed = now - tweenStartRef.current;
            const t = Math.min(1, elapsed / tweenDurationRef.current);
            const eased = easeInOutCubic(t);
            displayFrameRef.current = tweenFromRef.current + (tweenToRef.current - tweenFromRef.current) * eased;
            if (t >= 1) {
              displayFrameRef.current = tweenToRef.current;
              tweenActiveRef.current = false;
            }
          }
          displayFrameRef.current = Math.max(0, Math.min(TOTAL_FRAMES - 1, displayFrameRef.current));

          const frameIndex = Math.round(displayFrameRef.current);
          if (frameIndex !== lastDrawnFrame) {
            const img = imagesRef.current[frameIndex];
            const ctx = canvas?.getContext("2d");
            if (img && img.complete && canvas && ctx) {
              if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
              }
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              lastDrawnFrame = frameIndex;
            }
          }

          // Same subtle camera push as the original — untouched, this logic
          // never depended on video vs frames.
          const displayProgress = displayFrameRef.current / (TOTAL_FRAMES - 1);
          const scaleVal = 1 + displayProgress * 0.12;
          const zTranslate = displayProgress * 50;

          if (wrap) {
            const transform = `perspective(1000px) translateZ(${zTranslate.toFixed(2)}px) scale(${scaleVal.toFixed(4)})`;
            if (transform !== lastTransform) {
              wrap.style.transform = transform;
              lastTransform = transform;
            }
          }
        }
        animationFrameId = requestAnimationFrame(tick);
      };

      animationFrameId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const allLoaded = loadedCount >= TOTAL_FRAMES;

    return (
      <div
        ref={wrapRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          opacity: 0,
          pointerEvents: "none",
          willChange: "transform",
          transform: "perspective(1000px) translateZ(0px) scale(0.95)",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            filter: "brightness(1.12) saturate(1.08)",
          }}
        />

        {!allLoaded && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#95D5B2", fontSize: 12, fontFamily: "sans-serif" }}>
            {Math.round((loadedCount / TOTAL_FRAMES) * 100)}%
          </div>
        )}

        {/* Dark tint overlay — unchanged from the original */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(8,14,10,0.70) 0%, rgba(8,14,10,0.65) 50%, rgba(8,14,10,0.75) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Subtle vignette — unchanged from the original */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 46%, rgba(0,0,0,0.20) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>
    );
  }
);

ScrollDrivenBackground.displayName = "ScrollDrivenBackground";
export default ScrollDrivenBackground;