import { useState, useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";


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
 * @param {number} [options.threshold=0.12] - Viewport entry threshold (0 to 1)
 * @param {string} [options.rootMargin="0px 0px -40px 0px"]
 * @returns {[React.RefObject, boolean]} [ref, isVisible]
 */
export function useScrollAnimation({ threshold = 0.12, rootMargin = "0px 0px -40px 0px" } = {}) {
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
 * Uses a single shared IntersectionObserver to prevent observer explosion and main-thread delays on mobile.
 */
export function useRowScrollAnimation({
  threshold = 0.08,
  rootMargin = "0px 0px -30px 0px",
} = {}) {
  const shouldReduceMotion = useReducedMotion();
  const [rowVisibility, setRowVisibility] = useState({});
  const observerRef = useRef(null);
  const elementRowMap = useRef(new Map());

  // Initialize single shared IntersectionObserver
  useEffect(() => {
    if (shouldReduceMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const rowIndex = elementRowMap.current.get(entry.target);
          if (rowIndex === undefined) return;

          const rect = entry.boundingClientRect;
          const windowHeight =
            window.innerHeight || document.documentElement.clientHeight;

          if (rect.bottom < 0) {
            // Above viewport: keep visible
            setRowVisibility((prev) => (prev[rowIndex] ? prev : { ...prev, [rowIndex]: true }));
          } else if (entry.isIntersecting) {
            // Entered viewport (with lookahead rootMargin): animate entire row forward promptly
            setRowVisibility((prev) => (prev[rowIndex] ? prev : { ...prev, [rowIndex]: true }));
          } else {
            // Completely below viewport: reset row silently only if scrolled back above
            if (rect.top >= windowHeight - 2) {
              setRowVisibility((prev) => (!prev[rowIndex] ? prev : { ...prev, [rowIndex]: false }));
            }
          }
        });
      },
      {
        threshold: threshold === 0 ? [0] : [0, threshold],
        rootMargin,
      }
    );

    observerRef.current = observer;

    // Observe all currently registered elements
    elementRowMap.current.forEach((_, el) => {
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [shouldReduceMotion, threshold, rootMargin]);

  const registerRowElement = useCallback(
    (rowIndex, element) => {
      if (shouldReduceMotion) {
        setRowVisibility((prev) => (prev[rowIndex] ? prev : { ...prev, [rowIndex]: true }));
        return;
      }

      if (!element) {
        return;
      }

      if (elementRowMap.current.get(element) === rowIndex) {
        return;
      }

      elementRowMap.current.set(element, rowIndex);
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    },
    [shouldReduceMotion]
  );

  return { rowVisibility, registerRowElement, shouldReduceMotion };
}
