import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * FloatingPetals Component
 * Renders lightweight, ambient golden & rose petals gently drifting across the background.
 * Optimized with pure CSS keyframes, zero layout shifts, and respects prefers-reduced-motion.
 */
export default function FloatingPetals({ count = 16 }) {
  const shouldReduceMotion = useReducedMotion();

  // Generate deterministic random properties for petals
  const petals = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Deterministic pseudo-random generation based on index
      const left = ((i * 19 + 7) % 94) + 3; // 3% to 97%
      const duration = 14 + ((i * 9) % 12); // 14s to 26s (slow, peaceful drift)
      const delay = (i * 1.5) % 12; // 0s to 12s
      const size = 12 + ((i * 5) % 10); // 12px to 21px
      const rotate = ((i * 37) % 360);
      const isGold = i % 2 === 0;
      const isMobileHidden = i >= 7; // Retain 7 active petals on mobile, 16 on desktop

      return {
        id: i,
        left: `${left}%`,
        duration: `${duration}s`,
        delay: `${delay}s`,
        size: `${size}px`,
        rotate: `${rotate}deg`,
        isGold,
        isMobileHidden,
      };
    });
  }, [count]);

  if (shouldReduceMotion) return null;

  return (
    <div className="floating-petals-container" aria-hidden="true">
      {petals.map((p) => (
        <span
          key={p.id}
          className={`petal-slot ${p.isMobileHidden ? "petal-desktop-only" : ""}`}
          style={{
            left: p.left,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        >
          <span
            className={`petal ${p.isGold ? "petal-gold" : "petal-rose"}`}
            style={{
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
          />
        </span>
      ))}
    </div>
  );
}
