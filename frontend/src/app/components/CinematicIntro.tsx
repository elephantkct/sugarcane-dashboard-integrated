import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import introBg from "../../assets/sugarcane-intro (1).mp4";
import { User } from "../types";

interface CinematicIntroProps {
  onTransitionStart: () => void;
  onComplete: () => void;
  /** Fired the moment the video has decoded its first frame and is safe to reveal. */
  onReady: () => void;
}

export function CinematicIntro({ onTransitionStart, onComplete, onReady }: CinematicIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const onTransitionStartRef = useRef(onTransitionStart);
  const onCompleteRef = useRef(onComplete);
  const onReadyRef = useRef(onReady);

  onTransitionStartRef.current = onTransitionStart;
  onCompleteRef.current = onComplete;
  onReadyRef.current = onReady;

  // ── Reveal the video (and, in lockstep, the hero text living above it)
  // only once the first frame has actually decoded — never a black gap
  // followed by a pop-in.
  const handleVideoReady = useCallback(() => {
    setReady((prev) => {
      if (prev) return prev;
      onReadyRef.current();
      return true;
    });
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Already cached/decoded by the time we attached listeners.
    if (video.readyState >= 2) {
      handleVideoReady();
      return;
    }
    video.addEventListener("loadeddata", handleVideoReady);
    return () => video.removeEventListener("loadeddata", handleVideoReady);
  }, [handleVideoReady]);

    // If the user scrolls/wheels during the brief window before the video
    // has decoded, don't drop the gesture — remember it and fire the
    // transition automatically the instant readiness lands.
    const pendingTriggerRef = useRef(false);

    // ── Trigger the premium interface assembly background transition ─────
    const triggerTransition = useCallback(() => {
      if (isTransitioning) return;
      if (!ready) {
        pendingTriggerRef.current = true;
        return;
      }
      setIsTransitioning(true);
      onTransitionStartRef.current();

      const video = videoRef.current;
      if (!video) {
        onCompleteRef.current();
        return;
      }

      // Ensure the video continues playing naturally in the background
      video.play().catch(() => {});

      const tl = gsap.timeline({
        onComplete: () => {
          onCompleteRef.current();
        }
      });

      // 1. Pause the video only after approximately 90% of the interface has assembled (2.4s)
      tl.call(() => {
        if (video) video.pause();
      }, undefined, 2.4);

      // 2. Very gradually blur the frozen frame from blur(0px) to blur(6px) over 1300ms starting at 2.4s
      tl.fromTo(video,
        { filter: "blur(0px)" },
        { filter: "blur(6px)", duration: 1.3, ease: "power1.inOut" },
        2.4
      );

      // 3. While the blur increases, slowly fade in a very subtle dark overlay (max opacity around 22%)
      tl.to(overlayRef.current, {
        opacity: 1,
        duration: 1.3,
        ease: "power1.inOut"
      }, 2.4);

      // 4. Upgrade transition zoom: Scale UP the intro video container while fading it out to simulate camera pushing forward
      tl.to(videoWrapRef.current, {
        opacity: 0,
        scale: 1.15,
        duration: 0.8,
        ease: "power2.inOut"
      }, 3.5);

    }, [isTransitioning, ready]);

    // Fire any gesture that arrived before the video was ready as soon as
    // it becomes ready.
    useEffect(() => {
      if (ready && pendingTriggerRef.current) {
        pendingTriggerRef.current = false;
        triggerTransition();
      }
    }, [ready, triggerTransition]);

    // Setup scroll / interaction listeners — attached as soon as the intro
    // mounts (not gated on `ready`) so an early gesture is never lost;
    // triggerTransition() itself defers to the pending-trigger queue above
    // if the video isn't ready yet.
    useEffect(() => {
      if (isTransitioning) return;

      let touchStartY = 0;

      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY > 0) {
          triggerTransition();
        }
      };

      const handleTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY;
      };

      const handleTouchMove = (e: TouchEvent) => {
        const deltaY = touchStartY - e.touches[0].clientY;
        if (deltaY > 10) { // swipe up translates to scroll down
          triggerTransition();
        }
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (["ArrowDown", "PageDown", " ", "End"].includes(e.key)) {
          triggerTransition();
        }
      };

      const handleScroll = () => {
        if (window.scrollY > 3) {
          triggerTransition();
        }
      };

      window.addEventListener("wheel", handleWheel, { passive: true });
      window.addEventListener("touchstart", handleTouchStart, { passive: true });
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("keydown", handleKeyDown, { passive: true });
      window.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("scroll", handleScroll);
      };
    }, [isTransitioning, triggerTransition]);

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999, // Keep high z-index during transition so the zoom-out crossfade completes cleanly above dashboard-bg
          background: "var(--background)",
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
      {/* Centered video wrapper — fades in only once the first frame is decoded,
          so there is never a moment where the page shows a bare black/blank frame. */}
      <div
        ref={videoWrapRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: ready ? 1 : 0,
          transition: "opacity 0.6s ease-out",
          willChange: "opacity, filter",
          transformOrigin: "center center",
          zIndex: 1,
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            willChange: "filter",
            filter: "blur(0px)",
          }}
        >
          <source src={introBg} type="video/mp4" />
        </video>

        {/* Subtle Dark Overlay (Max 22% Opacity) */}
        <div
          ref={overlayRef}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.22)",
            opacity: 0,
            willChange: "opacity",
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* Subtle radial vignette overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      </div>
    </div>
  );
}
