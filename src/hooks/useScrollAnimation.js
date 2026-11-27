import { useState, useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Global Scroll Direction Tracking with RAF Throttling
 * Tracks whether user is actively scrolling DOWN or UP.
 * Throttled via requestAnimationFrame so it executes at most once per display frame.
 * Uses a 4px deadzone to eliminate micro-jitter and touch noise.
 */
let currentScrollDirection = "down";
let lastScrollY = typeof window !== "undefined" ? (window.scrollY || window.pageYOffset || 0) : 0;
let isScrollListenerAttached = false;
let rafTicking = false;

function ensureScrollListener() {
  if (typeof window === "undefined" || isScrollListenerAttached) return;
  isScrollListenerAttached = true;
  lastScrollY = window.scrollY || window.pageYOffset || 0;

  window.addEventListener(
    "scroll",
    () => {
      if (!rafTicking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY || window.pageYOffset || 0;
          const delta = currentY - lastScrollY;
          if (Math.abs(delta) >= 4) {
            currentScrollDirection = delta > 0 ? "down" : "up";
            lastScrollY = currentY;
          }
          rafTicking = false;
        });
        rafTicking = true;
      }
    },
    { passive: true }
  );
}

if (typeof window !== "undefined") {
  ensureScrollListener();
}

/**
 * Shared IntersectionObserver Pool for standard ScrollReveal sections.
 * Consolidates all ScrollReveal instances sharing the same threshold & rootMargin
 * into a single IntersectionObserver, reducing active observer count from 20+ down to 1.
 */
const observerPool = new Map();

function getSharedObserver(threshold, rootMargin) {
  const key = `${threshold}_${rootMargin}`;
  let poolItem = observerPool.get(key);

  if (!poolItem) {
    const callbacks = new Map();
    const thresholds = threshold === 0 ? [0] : [0, threshold];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cb = callbacks.get(entry.target);
          if (cb) cb(entry);
        });
      },
      {
        threshold: thresholds,
        rootMargin,
      }
    );

    poolItem = { observer, callbacks, count: 0 };
    observerPool.set(key, poolItem);
  }

  return poolItem;
}

/**
 * useScrollAnimation Hook
 *
 * Implements MAXIMUM LAZY SCROLLING & DIRECTION-AWARE REPLAY:
 * 1. Scrolling DOWN: Triggers entrance animation when element enters the viewport.
 * 2. Scrolling UP: Never triggers entrance animations; elements appear immediately in completed state.
 * 3. Viewport exit: Silently resets animation state when element leaves the viewport completely.
 * 4. Downward Replay: Replays entrance animation every time the user scrolls DOWN into the element.
 * 5. Shared Observer Pool: Reuses a single IntersectionObserver instance across all sections.
 * 6. Zero Forced Layouts: Uses ratio and clientHeight without triggering DOM reflow.
 * 7. Accessibility: Immediately visible with zero motion when prefers-reduced-motion is active.
 *
 * @param {Object} options
 * @param {number} [options.threshold=0.08] - Viewport entry threshold (0 to 1)
 * @param {string} [options.rootMargin="0px 0px -20px 0px"] - Buffer to prevent premature trigger
 * @returns {[React.RefObject, boolean, boolean]} [ref, isVisible, shouldAnimate]
 */
export function useScrollAnimation({
  threshold = 0.08,
  rootMargin = "0px 0px -20px 0px",
} = {}) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(Boolean(shouldReduceMotion));
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    ensureScrollListener();
    if (shouldReduceMotion) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    const poolItem = getSharedObserver(threshold, rootMargin);

    const onEntry = (entry) => {
      const rect = entry.boundingClientRect;
      const windowHeight =
        window.innerHeight || document.documentElement.clientHeight;

      // Guard against tall elements whose height exceeds the viewport
      const entryThreshold =
        rect.height > windowHeight
          ? (windowHeight * threshold) / rect.height
          : threshold;

      // 1. Element enters viewport
      if (entry.isIntersecting && entry.intersectionRatio >= entryThreshold) {
        const isScrollingDown = currentScrollDirection === "down";
        setShouldAnimate(isScrollingDown);
        setIsVisible((prev) => (prev ? prev : true));
      }
      // 2. Element completely leaves viewport (above or below) -> reset for replay
      else if (!entry.isIntersecting || entry.intersectionRatio === 0) {
        setIsVisible((prev) => (!prev ? prev : false));
        setShouldAnimate(false);
      }
    };

    poolItem.callbacks.set(element, onEntry);
    poolItem.observer.observe(element);
    poolItem.count += 1;

    return () => {
      poolItem.callbacks.delete(element);
      poolItem.observer.unobserve(element);
      poolItem.count -= 1;

      if (poolItem.count <= 0) {
        poolItem.observer.disconnect();
        observerPool.delete(`${threshold}_${rootMargin}`);
      }
    };
  }, [shouldReduceMotion, threshold, rootMargin]);

  return [ref, isVisible, shouldAnimate];
}

/**
 * useRowScrollAnimation Hook
 * Synchronizes row animations across PhotoGallery pairs with scroll direction awareness.
 * Uses a single shared IntersectionObserver to observe all 25 photo items.
 *
 * Requirements:
 * 1. Synchronized: Both images in each pair share the exact same row visibility and direction triggers.
 * 2. Downward Replay: Replays both images together only when entering while scrolling DOWN.
 * 3. Upward Entry: Never replays the pair when entering while scrolling UP; renders immediately in completed state.
 * 4. Hysteresis: Exits only when ALL items in the row have completely left the viewport.
 * 5. Batched State Updates: At most one state call per observer tick.
 *
 * @param {Object} options
 * @param {number} [options.threshold=0.02] - Viewport entry threshold (0 to 1)
 * @param {string} [options.rootMargin="20px 0px 20px 0px"] - Balanced buffer for scroll entry
 * @returns {{ rowVisibility: Object, rowShouldAnimate: Object, registerRowElement: Function, shouldReduceMotion: boolean }}
 */
export function useRowScrollAnimation({
  threshold = 0.02,
  rootMargin = "20px 0px 20px 0px",
} = {}) {
  const shouldReduceMotion = useReducedMotion();
  const [rowVisibility, setRowVisibility] = useState({});
  const [rowShouldAnimate, setRowShouldAnimate] = useState({});
  const observerRef = useRef(null);
  const elementRowMap = useRef(new Map());
  const rowIntersections = useRef(new Map());

  // Initialize single shared IntersectionObserver
  useEffect(() => {
    ensureScrollListener();
    if (shouldReduceMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let hasVisibilityChanges = false;
        let hasAnimateChanges = false;
        const visibilityUpdates = {};
        const animateUpdates = {};

        entries.forEach((entry) => {
          const element = entry.target;
          const rowIndex = elementRowMap.current.get(element);
          if (rowIndex === undefined) return;

          let activeSet = rowIntersections.current.get(rowIndex);
          if (!activeSet) {
            activeSet = new Set();
            rowIntersections.current.set(rowIndex, activeSet);
          }

          const rect = entry.boundingClientRect;
          const windowHeight =
            window.innerHeight || document.documentElement.clientHeight;

          const entryThreshold =
            rect.height > windowHeight
              ? (windowHeight * threshold) / rect.height
              : threshold;

          const isEntering =
            entry.isIntersecting && entry.intersectionRatio >= entryThreshold;
          const isExiting =
            !entry.isIntersecting || entry.intersectionRatio === 0;

          if (isEntering) {
            if (!activeSet.has(element)) {
              activeSet.add(element);
              visibilityUpdates[rowIndex] = true;
              hasVisibilityChanges = true;

              // Only animate when entering while scrolling DOWN
              const isScrollingDown = currentScrollDirection === "down";
              animateUpdates[rowIndex] = isScrollingDown;
              hasAnimateChanges = true;
            }
          } else if (isExiting) {
            if (activeSet.has(element)) {
              activeSet.delete(element);
              if (activeSet.size === 0) {
                visibilityUpdates[rowIndex] = false;
                animateUpdates[rowIndex] = false;
                hasVisibilityChanges = true;
                hasAnimateChanges = true;
              }
            }
          }
        });

        // Batch row visibility updates in a single state update
        if (hasVisibilityChanges) {
          setRowVisibility((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const [rIdx, val] of Object.entries(visibilityUpdates)) {
              if (Boolean(next[rIdx]) !== val) {
                next[rIdx] = val;
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }

        // Batch row animation direction updates in a single state update
        if (hasAnimateChanges) {
          setRowShouldAnimate((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const [rIdx, val] of Object.entries(animateUpdates)) {
              if (Boolean(next[rIdx]) !== val) {
                next[rIdx] = val;
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }
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

    const intersections = rowIntersections.current;

    return () => {
      observer.disconnect();
      observerRef.current = null;
      intersections.clear();
    };
  }, [shouldReduceMotion, threshold, rootMargin]);

  const registerRowElement = useCallback(
    (rowIndex, element) => {
      if (shouldReduceMotion) {
        setRowVisibility((prev) =>
          prev[rowIndex] ? prev : { ...prev, [rowIndex]: true }
        );
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

  return { rowVisibility, rowShouldAnimate, registerRowElement, shouldReduceMotion };
}
