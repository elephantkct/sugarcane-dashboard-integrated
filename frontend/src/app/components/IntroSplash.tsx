import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import introVideo from "../../assets/sugarcane-intro (1).mp4";

const SESSION_KEY = "edf_intro_seen";

export function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function IntroSplash({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);
  const reduceMotion = useReducedMotion();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(finish, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    if (timerRef.current) clearTimeout(timerRef.current);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    setVisible(false);
  }

  const stagger = (delay: number, duration = 0.5) =>
    reduceMotion
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration, ease: [0.16, 1, 0.3, 1] as const },
        };

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden"
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.6, ease: [0.65, 0, 0.35, 1] }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            src={introVideo}
          />
          <div className="absolute inset-0" style={{ background: "rgba(30,38,24,0.55)" }} />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.35) 100%)" }}
          />

          <div className="relative z-10 h-full flex items-center px-8 md:px-16">
            <div className="max-w-2xl">
              <motion.p
                {...stagger(0.1)}
                className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-4"
                style={{ color: "rgba(245,247,242,0.9)" }}
              >
                Environmental Defense Fund
              </motion.p>
              <motion.h1
                {...stagger(0.22, 0.6)}
                className="font-semibold leading-[1.05] tracking-tight text-[44px] md:text-[64px] mb-4"
                style={{ color: "#F5F7F2" }}
              >
                Sugarcane Analytics Platform
              </motion.h1>
              <motion.p {...stagger(0.34)} className="text-[18px]" style={{ color: "rgba(245,247,242,0.75)" }}>
                Data-driven Agricultural Intelligence
              </motion.p>
            </div>
          </div>

          <motion.button
            onClick={finish}
            {...stagger(0.46)}
            className="absolute bottom-8 left-8 md:left-16 text-[13px] font-medium px-4 py-2 rounded-full cursor-pointer"
            style={{ border: "1px solid rgba(245,247,242,0.4)", color: "#F5F7F2", background: "transparent" }}
          >
            Skip intro →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
