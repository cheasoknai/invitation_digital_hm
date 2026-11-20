import { useState, useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Global Scroll Direction Tracker
 * Accurately detects whether the user is scrolling 'down' or 'up'.
 */
let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;
let scrollDirection = "down";
const directionSubscribers = new Set();

if (typeof window !== "undefined") {
  let rafId = null;

  const onScroll = () => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) >= 1) {
        scrollDirection = currentScrollY > lastScrollY ? "down" : "up";
        directionSubscribers.forEach((cb) => cb(scrollDirection, currentScrollY));
        lastScrollY = currentScrollY;
      }
      rafId = null;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
}

export function getScrollDirection() {
  return scrollDirection;
}

export function subscribeScrollDirection(fn) {
  directionSubscribers.add(fn);
  return () => directionSubscribers.delete(fn);
}

/**
 * useScrollAnimation Hook
 *
 * Implements FORWARD-ONLY, REPEATABLE scroll animations:
 * 1. TOP -> DOWN: Triggers forward animation when element enters the viewport.
 * 2. DOWN -> TOP: Never reverses. Keeps element visible in its completed state.
 * 3. TOP -> DOWN AGAIN: Resets only when the element has completely left the viewport
 *    at the bottom (user has scrolled back above the element). Replays forward on downward re-entry.
 * 4. Respects prefers-reduced-motion accessibility.
 *
 * @param {Object} options
 * @param {number} [options.threshold=0.15] - Viewport entry threshold (0 to 1)
 * @param {string} [options.rootMargin="0px"]
 * @returns {[React.RefObject, boolean]} [ref, isVisible]
 */
export function useScrollAnimation({ threshold = 0.15, rootMargin = "0px" } = {}) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(Boolean(shouldReduceMotion));

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    const thresholds = threshold === 0 ? [0] : [0, threshold];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const rect = entry.boundingClientRect;
          const windowHeight =
            window.innerHeight || document.documentElement.clientHeight;

          // 1. Element is above the viewport (scrolled past it) -> keep visible
          if (rect.bottom < 0) {
            setIsVisible(true);
          }
          // 2. Element enters viewport (scrolling down to it) -> animate forward
          else if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            setIsVisible(true);
          }
          // 3. Element has completely left the viewport at the bottom -> reset silently
          else if (!entry.isIntersecting || entry.intersectionRatio === 0) {
            if (rect.top >= windowHeight - 2) {
              // User has scrolled back above the element. It is completely off-screen below.
              setIsVisible(false);
            }
          }
        });
      },
      {
        threshold: thresholds,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [shouldReduceMotion, threshold, rootMargin]);

  return [ref, isVisible];
}

/**
 * useRowScrollAnimation Hook
 * Synchronizes row animations across grid items (e.g., photo gallery pairs).
 */
export function useRowScrollAnimation({ threshold = 0.1, rootMargin = "0px" } = {}) {
  const shouldReduceMotion = useReducedMotion();
  const [rowVisibility, setRowVisibility] = useState({});

  const registerRowElement = useCallback(
    (rowIndex, element) => {
      if (!element) return () => {};

      if (shouldReduceMotion) {
        setRowVisibility((prev) => (prev[rowIndex] ? prev : { ...prev, [rowIndex]: true }));
        return () => {};
      }

      const thresholds = threshold === 0 ? [0] : [0, threshold];

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const rect = entry.boundingClientRect;
            const windowHeight =
              window.innerHeight || document.documentElement.clientHeight;

            if (rect.bottom < 0) {
              // Above viewport: keep visible
              setRowVisibility((prev) => (prev[rowIndex] ? prev : { ...prev, [rowIndex]: true }));
            } else if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
              // Entered viewport: animate entire row forward
              setRowVisibility((prev) => (prev[rowIndex] ? prev : { ...prev, [rowIndex]: true }));
            } else if (!entry.isIntersecting || entry.intersectionRatio === 0) {
              // Completely below viewport: reset row silently
              if (rect.top >= windowHeight - 2) {
                setRowVisibility((prev) => (!prev[rowIndex] ? prev : { ...prev, [rowIndex]: false }));
              }
            }
          });
        },
        { threshold: thresholds, rootMargin }
      );

      observer.observe(element);
      return () => observer.disconnect();
    },
    [shouldReduceMotion, threshold, rootMargin]
  );

  return { rowVisibility, registerRowElement, shouldReduceMotion };
}
