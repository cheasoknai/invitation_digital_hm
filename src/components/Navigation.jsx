import { useState, useEffect } from "react";
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

  // IntersectionObserver to detect active visible section on scroll
  useEffect(() => {
    if (!isVisible) return;

    const sectionElements = NAV_ITEMS
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (sectionElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: 0,
      }
    );

    sectionElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [isVisible]);

  const handleNavClick = (id) => {
    setActiveSection(id);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
              aria-label={`Scroll to ${item.labelEn}`}
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
