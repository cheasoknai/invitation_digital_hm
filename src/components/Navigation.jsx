import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Users, CalendarDays, MapPin, Image, Gift, CheckCircle2 } from "lucide-react";

const NAV_ITEMS = [
  { id: "couple", labelKh: "គូស្វាមី", labelEn: "Couple", icon: Users },
  { id: "schedule", labelKh: "កម្មវិធី", labelEn: "Schedule", icon: CalendarDays },
  { id: "venue", labelKh: "ទីតាំង", labelEn: "Venue", icon: MapPin },
  { id: "rsvp", labelKh: "ឆ្លើយតប", labelEn: "RSVP", icon: CheckCircle2 },
  { id: "gallery", labelKh: "រូបភាព", labelEn: "Gallery", icon: Image },
  { id: "gift", labelKh: "ចំណងដៃ", labelEn: "Gift", icon: Gift },
];

/**
 * Navigation Component
 * Floating Luxury Navigation Dock with smooth scrolling, mobile responsive layout,
 * and animated active indicators powered by IntersectionObserver and Framer Motion.
 */
export default function Navigation({ isVisible }) {
  const shouldReduceMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState("couple");
  const isManualScrolling = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // IntersectionObserver to detect active visible section on scroll
  useEffect(() => {
    if (!isVisible) return;

    // Detect if user has reached bottom of page (where Gift section lives)
    const handleScroll = () => {
      if (isManualScrolling.current) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const totalHeight = document.documentElement.scrollHeight;

      // If within 80px of the very bottom, lock active section to 'gift'
      if (totalHeight - scrollPosition <= 80) {
        setActiveSection("gift");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    const sectionElements = NAV_ITEMS
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (sectionElements.length === 0) {
      return () => window.removeEventListener("scroll", handleScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // If user just clicked a nav button, ignore intermediate section crossings
        if (isManualScrolling.current) return;

        // Check if near bottom
        const scrollPosition = window.innerHeight + window.scrollY;
        const totalHeight = document.documentElement.scrollHeight;
        if (totalHeight - scrollPosition <= 80) {
          setActiveSection("gift");
          return;
        }

        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort(
            (a, b) => b.intersectionRatio - a.intersectionRatio
          );
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-15% 0px -45% 0px",
        threshold: [0.1, 0.25, 0.5],
      }
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isVisible]);

  const handleNavClick = (id) => {
    // 1. Immediately lock active section so it doesn't jitter during smooth scroll
    setActiveSection(id);
    isManualScrolling.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const target = document.getElementById(id);
    if (target) {
      const yOffset = -20;
      const targetY =
        target.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }

    // Unlock after smooth scroll completes
    scrollTimeoutRef.current = setTimeout(() => {
      isManualScrolling.current = false;
    }, 1200);
  };

  if (!isVisible) return null;

  return (
    <nav className="luxury-floating-nav" aria-label="Quick Section Navigation">
      <div className="nav-dock-container">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`nav-pill-btn ${isActive ? "is-active" : ""}`}
              onClick={() => handleNavClick(item.id)}
              aria-current={isActive ? "true" : undefined}
              aria-label={`${item.labelKh} - ${item.labelEn}`}
              title={item.labelKh}
            >
              {/* Animated active gold pill indicator */}
              {isActive && (
                <motion.span
                  layoutId={shouldReduceMotion ? undefined : "activeNavPill"}
                  className="nav-active-indicator"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <span className="nav-pill-content">
                <Icon size={16} className="nav-icon" aria-hidden="true" />
                <span className="nav-label font-khmer">{item.labelKh}</span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
