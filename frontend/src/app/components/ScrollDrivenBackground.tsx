import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import dashBg from "../../assets/dashboard-bg.mp4";

// Default travel time for a camera move when the caller doesn't specify one.
const DEFAULT_CAMERA_MS = 2000;

// Symmetric accelerate-then-decelerate easing — the camera gently picks up
// speed leaving a section and eases off arriving at the next one, instead of
// snapping straight to a constant velocity. A cubic curve (rather than a
// steeper quint) keeps the middle of the move from ever feeling like a
// sudden burst of speed — gentle throughout, not just at the edges. Being a
// fixed-duration tween (not an asymptotic decay), it also *finishes*: no
// infinitely-shrinking tail chasing the target after the user has stopped
// scrolling.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface ScrollDrivenBackgroundHandle {
  /** Called by App when CinematicIntro fires onTransitionStart — begin fading in */
  beginReveal: () => void;
  /** Called by App when CinematicIntro fires onComplete — video is now fully visible, start listening to scene changes */
  lockAndListen: () => void;
  /** Smoothly drive the video toward a normalized [0,1] position in the dashboard
   *  journey over `durationMs` — called once the outgoing content has fully
   *  dissolved, so the camera move reads as its own cinematic beat rather than
   *  something chasing a constantly-moving target. */
  goToProgress: (progress: number, durationMs?: number) => void;
}

const ScrollDrivenBackground = forwardRef<ScrollDrivenBackgroundHandle, {}>(
  (_props, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const displayTimeRef = useRef<number>(0);
    const lockedRef = useRef<boolean>(false);
    // The time value we last asked the decoder to seek to. Used to measure how
    // stale an in-flight seek has become so we know when it's worth aborting.
    const lastRequestedTimeRef = useRef<number>(0);

    // Fixed-duration tween state — displayTimeRef always holds the current
    // interpolated value (whether mid-tween or settled), so retargeting
    // mid-flight (tweenFrom = displayTimeRef.current) is always continuous,
    // never a jump.
    const tweenFromRef = useRef<number>(0);
    const tweenToRef = useRef<number>(0);
    const tweenStartRef = useRef<number>(0);
    const tweenDurationRef = useRef<number>(DEFAULT_CAMERA_MS);
    const tweenActiveRef = useRef<boolean>(false);

    // Expose imperative handle so App can drive the transition
    useImperativeHandle(ref, () => ({
      beginReveal() {
        const wrap = wrapRef.current;
        const video = videoRef.current;
        if (!wrap) return;
        wrap.style.transition = "opacity 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s, transform 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s";
        wrap.style.opacity = "1";
        wrap.style.transform = "perspective(1000px) translateZ(0px) scale(1)";
        if (video) {
          video.muted = true;
          video.play().catch(() => {});
        }
      },
      lockAndListen() {
        const video = videoRef.current;
        if (!video) return;
        video.pause();
        displayTimeRef.current = video.currentTime;
        lastRequestedTimeRef.current = video.currentTime;
        tweenFromRef.current = video.currentTime;
        tweenToRef.current = video.currentTime;
        tweenActiveRef.current = false;
        lockedRef.current = true;
      },
      goToProgress(progress: number, durationMs = DEFAULT_CAMERA_MS) {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        const clamped = Math.max(0, Math.min(1, progress));
        tweenFromRef.current = displayTimeRef.current;
        tweenToRef.current = clamped * video.duration;
        tweenStartRef.current = performance.now();
        tweenDurationRef.current = Math.max(1, durationMs);
        tweenActiveRef.current = true;
      },
    }));

    // Load & preload the video silently on mount, then force an actual
    // decode of the first frame (some browsers only decode once playback
    // starts) so beginReveal()'s .play() call has zero decode delay and the
    // transition into dashboard-bg is instant with no blank/loading frame.
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      video.load();
      video.muted = true;
      video.currentTime = 0;

      const forceDecode = () => {
        video.play()
          .then(() => {
            video.pause();
            video.currentTime = 0;
          })
          .catch(() => {});
      };

      if (video.readyState >= 2) {
        forceDecode();
      } else {
        video.addEventListener("loadeddata", forceDecode, { once: true });
      }
      return () => video.removeEventListener("loadeddata", forceDecode);
    }, []);

    // Drive the video's currentTime along a fixed-duration eased tween
    // whenever goToProgress() sets one up — a deliberate, cinematic camera
    // move that visibly accelerates and decelerates and then comes fully to
    // rest, rather than an unbounded exponential chase.
    useEffect(() => {
      let animationFrameId: number;

      // How stale (seconds) an in-flight seek's destination must become
      // before we abort it and retarget to the live position — keeps the
      // video from ever stalling behind a slow decode.
      const RETARGET_THRESHOLD = 0.12;
      // Seeks finer than one display frame (~1/60s) are wasted work: the
      // browser can't render a visually distinct frame for them, but each
      // one still costs a decode.
      const SEEK_EPSILON = 1 / 60;

      // Last transform string actually written to the DOM — lets us skip
      // the write (and the recompositing it forces on every blurred/glass
      // layer above the video) once the tween has finished, rather than
      // writing a visually-identical style every single frame forever.
      let lastTransform = "";

      const tick = (now: number) => {
        const video = videoRef.current;
        const wrap = wrapRef.current;
        if (video && video.duration && lockedRef.current && !document.hidden) {
          if (tweenActiveRef.current) {
            const elapsed = now - tweenStartRef.current;
            const t = Math.min(1, elapsed / tweenDurationRef.current);
            const eased = easeInOutCubic(t);
            displayTimeRef.current = tweenFromRef.current + (tweenToRef.current - tweenFromRef.current) * eased;
            if (t >= 1) {
              displayTimeRef.current = tweenToRef.current;
              tweenActiveRef.current = false;
            }
          }
          displayTimeRef.current = Math.max(0, Math.min(video.duration, displayTimeRef.current));

          // Decide whether to (re)issue a seek. We use the video's own native
          // `seeking` flag rather than tracking it ourselves — it's always
          // correct. If a seek is already in flight we don't retarget it on
          // every frame (re-assigning currentTime aborts and restarts the
          // decode) — only once its destination has gone stale.
          if (!video.seeking) {
            if (Math.abs(video.currentTime - displayTimeRef.current) > SEEK_EPSILON) {
              video.currentTime = displayTimeRef.current;
              lastRequestedTimeRef.current = displayTimeRef.current;
            }
          } else if (Math.abs(displayTimeRef.current - lastRequestedTimeRef.current) > RETARGET_THRESHOLD) {
            video.currentTime = displayTimeRef.current;
            lastRequestedTimeRef.current = displayTimeRef.current;
          }

          // Subtle camera push that deepens as the journey progresses.
          const displayProgress = displayTimeRef.current / video.duration;
          const scaleVal = 1 + displayProgress * 0.12;
          const zTranslate = displayProgress * 50;

          if (wrap) {
            // Round to the smallest step that can ever read as visually
            // distinct — lets the string dedup below actually converge
            // instead of chasing floating-point noise forever.
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

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }, []);

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
        {/* Main background video */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            // Slight lift so the sugarcane field reads clearly through the overlay
            // below, without blowing out highlights.
            filter: "brightness(1.12) saturate(1.08)",
          }}
        >
          <source src={dashBg} type="video/mp4" />
        </video>

        {/* Dark tint overlay — keeps content readable */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(8,14,10,0.20) 0%, rgba(8,14,10,0.12) 50%, rgba(8,14,10,0.22) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* Subtle vignette */}
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
