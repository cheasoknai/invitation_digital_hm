import { motion, useReducedMotion } from "framer-motion";
import { useScrollAnimation } from "../../hooks/useScrollAnimation.js";

/**
 * ScrollReveal Component
 * Reusable wrapper providing Forward-Only, Repeatable scroll animations across the project.
 *
 * Requirements satisfied:
 * - TOP -> DOWN: Animate forward smoothly when entering viewport.
 * - DOWN -> TOP: Never animate in reverse. Keep elements visible in completed state.
 * - TOP -> DOWN AGAIN: Replays forward when scrolling down again after being scrolled back above.
 * - Prefers-reduced-motion: Immediately visible with zero animation when enabled.
 */
export default function ScrollReveal({
  children,
  className = "",
  initial = { opacity: 0, y: 40 },
  animate = { opacity: 1, y: 0 },
  transition = { duration: 1.6, ease: [0.16, 1, 0.3, 1] },
  threshold = 0.12,
  rootMargin = "0px 0px -40px 0px",
  as: Component = motion.div,
  style,
  ...restProps
}) {
  const shouldReduceMotion = useReducedMotion();
  const [ref, isVisible] = useScrollAnimation({ threshold, rootMargin });

  if (shouldReduceMotion) {
    return (
      <Component className={className} style={style} {...restProps}>
        {children}
      </Component>
    );
  }

  return (
    <Component
      ref={ref}
      className={className}
      initial={initial}
      animate={isVisible ? animate : initial}
      transition={isVisible ? transition : { duration: 0 }}
      style={style}
      {...restProps}
    >
      {children}
    </Component>
  );
}
