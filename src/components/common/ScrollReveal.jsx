import { motion, useReducedMotion } from "framer-motion";
import { useScrollAnimation } from "../../hooks/useScrollAnimation.js";

/**
 * ScrollReveal Component
 * Reusable wrapper providing Scroll Direction-Aware scroll animations across the project.
 *
 * Requirements satisfied:
 * - Scrolling DOWN: Triggers entrance animations smoothly.
 * - Scrolling UP: Never triggers entrance animations; displays immediately in completed state.
 * - Viewport exit: Resets animation state silently off-screen.
 * - Downward Replay: Replays entrance animation every time user scrolls DOWN into the element.
 * - Prefers-reduced-motion: Immediately visible with zero animation when enabled.
 * - Boundary stability: Uses hysteresis to eliminate edge jitter.
 */
export default function ScrollReveal({
  children,
  className = "",
  initial = { opacity: 0, y: 35 },
  animate = { opacity: 1, y: 0 },
  transition = { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  threshold = 0.08,
  rootMargin = "0px 0px -20px 0px",
  as: Component = motion.div,
  style,
  delay,
  ...restProps
}) {
  const shouldReduceMotion = useReducedMotion();
  const [ref, isVisible, shouldAnimate] = useScrollAnimation({ threshold, rootMargin });

  if (shouldReduceMotion) {
    return (
      <Component className={className} style={style} {...restProps}>
        {children}
      </Component>
    );
  }

  const effectiveTransition =
    delay !== undefined
      ? { ...transition, delay }
      : transition;

  return (
    <Component
      ref={ref}
      className={className}
      initial={initial}
      animate={isVisible ? animate : initial}
      transition={
        isVisible
          ? shouldAnimate
            ? effectiveTransition
            : { duration: 0, delay: 0 }
          : { duration: 0, delay: 0 }
      }
      style={style}
      {...restProps}
    >
      {children}
    </Component>
  );
}
