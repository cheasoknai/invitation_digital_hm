import { useReducedMotion } from "framer-motion";
import Countdown from "./Countdown.jsx";
import AddToCalendar from "./AddToCalendar.jsx";
import invitationData from "../data/invitation.js";
import ScrollReveal from "./common/ScrollReveal.jsx";

/**
 * Custom Khmer Traditional Gold Line-Art Icons
 * Cohesive premium Cambodian traditional wedding line-art icons in #B59B6D gold stroke.
 */
const CeremonyIcon = ({ type }) => {
  const strokeColor = "var(--color-gold)";

  switch (type) {
    case "betel-tray": // ០៥:៤០ ព្រឹក - យកពេលាកូនប្រុស (Traditional Cambodian betel leaf & areca nut offering tray)
      return (
        <svg
          viewBox="0 0 64 48"
          className="timeline-svg-icon"
          aria-hidden="true"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Pedestal Foot Base */}
          <path d="M20 41 H44" />
          <path d="M22 41 L25 35 H39 L42 41" />
          {/* Pedestal Waist & Collar Ring */}
          <path d="M27 35 V31 H37 V35" />
          <path d="M25 31 H39" />
          {/* Ornate Scalloped Bowl */}
          <path d="M16 23 C16 29 24 31 32 31 C40 31 48 29 48 23" />
          <path d="M14 23 C18 24.5 25 24.5 32 23 C39 24.5 46 24.5 50 23" />
          {/* Conical Betel Leaf Offering (ស្លាដក់) */}
          <path d="M25 22 C25 14 30 8.5 32 7 C34 8.5 39 14 39 22" />
          <path d="M32 9 V22" />
          {/* Symmetrical Layered Betel Leaves */}
          <path d="M21 21 C22 16 26 13 32 10.5 C38 13 42 16 43 21" />
          <path d="M18 22 C19 18 23 16 28 17 M46 22 C45 18 41 16 36 17" />
          {/* Sacred Pinnacle Bud */}
          <circle cx="32" cy="7" r="1.4" fill={strokeColor} />
        </svg>
      );

    case "krong-pali": // ០៦:៣០ ព្រឹក - ពិធីក្រុងពាលី (Traditional Cambodian ceremonial offering altar / Bay Sei)
      return (
        <svg
          viewBox="0 0 64 48"
          className="timeline-svg-icon"
          aria-hidden="true"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Offering Tray Base */}
          <path d="M18 41 H46" />
          <path d="M23 41 L26 37 H38 L41 41" />
          <path d="M16 37 H48" />
          {/* Tier 1 - Lower Folded Banana Leaf Tier */}
          <path d="M18 37 C18 31 24 30 32 32 C40 30 46 31 46 37" />
          <path d="M20 37 L24 31 M44 37 L40 31" />
          {/* Tier 2 - Middle Tier */}
          <path d="M22 30 C22 25 26 24 32 25 C38 24 42 25 42 30" />
          <path d="M24 30 L27 25 M40 30 L37 25" />
          {/* Tier 3 - Pinnacle Tier */}
          <path d="M26 24 C26 19 29 18 32 19 C35 18 38 19 38 24" />
          {/* Sacred Candle Stick & Flame */}
          <path d="M32 18 V12" />
          <path
            d="M32 6 C30.5 8 30.5 10 32 11.5 C33.5 10 33.5 8 32 6 Z"
            fill={strokeColor}
            fillOpacity="0.25"
          />
          {/* Incense Sticks with Ascending Sacred Spirals */}
          <path d="M25 28 L17 14 C15 12 17 9 20 10" />
          <path d="M39 28 L47 14 C49 12 47 9 44 10" />
        </svg>
      );

    case "procession": // ០៧:០០ ព្រឹក - ពិធីហែជំនូន (Traditional Khmer wedding procession with ceremonial gift trays)
      return (
        <svg
          viewBox="0 0 64 48"
          className="timeline-svg-icon"
          aria-hidden="true"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Procession Tray Base */}
          <path d="M22 39 H42" />
          <path d="M25 39 L27 35 H37 L39 39" />
          <path d="M16 35 H48" />
          {/* Domed Embroidered Ceremonial Gift Cover (គម្របផ្កាស្លា) */}
          <path d="M18 35 C18 21 24 14 32 13 C40 14 46 21 46 35" />
          {/* Ornate Lattice Pattern & Floral Bands */}
          <path d="M24 35 C24 23 28 17 32 13" />
          <path d="M40 35 C40 23 36 17 32 13" />
          <path d="M19 28 C25 29.5 39 29.5 45 28" />
          <path d="M23 21 C27 22 37 22 41 21" />
          {/* Spire Finial */}
          <path d="M32 13 V8" />
          <circle cx="32" cy="7" r="1.4" fill={strokeColor} />
          {/* Escort Hands Uplifting the Tray */}
          <path d="M10 38 C14 36 18 36 22 35" />
          <path d="M54 38 C50 36 46 36 42 35" />
          {/* Festive Ribbon Streamers */}
          <path d="M11 23 C7 25 9 29 13 30" />
          <path d="M53 23 C57 25 55 29 51 30" />
        </svg>
      );

    case "scissors": // ០៩:០០ ព្រឹក - ពិធីកាត់សក់បង្កក់សិរី (Ceremonial shears for hair-cutting blessing)
      return (
        <svg
          viewBox="0 0 64 48"
          className="timeline-svg-icon"
          aria-hidden="true"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Ornate Finger Loops with Traditional Scroll Accents */}
          <path d="M22 38 C17 38 15 33 19 29 C22 26 26 27 27 31 C28 35 25 38 22 38 Z" />
          <path d="M42 38 C47 38 49 33 45 29 C42 26 38 27 37 31 C36 35 39 38 42 38 Z" />
          <path d="M21 34 C19 34 18 32 20 31" />
          <path d="M43 34 C45 34 46 32 44 31" />
          {/* Pivot Junction Rosette */}
          <circle
            cx="32"
            cy="24"
            r="2.4"
            fill={strokeColor}
            fillOpacity="0.2"
          />
          <circle cx="32" cy="24" r="0.9" fill={strokeColor} />
          {/* Symmetrical Tapered Blades */}
          <path d="M28 22 L19 8" />
          <path d="M36 22 L45 8" />
          <path d="M30 20 L22 9" />
          <path d="M34 20 L42 9" />
          {/* Sacred Blessing Droplets & Jasmine Blossoms */}
          <path
            d="M32 9 C30.8 11.2 30.8 12.8 32 14 C33.2 12.8 33.2 11.2 32 9 Z"
            fill={strokeColor}
            fillOpacity="0.25"
          />
          <path d="M25 15 C24 16.5 24 17.5 25 18" />
          <path d="M39 15 C40 16.5 40 17.5 39 18" />
        </svg>
      );

    case "sword-hands": // ១១:០០ ថ្ងៃត្រង់ - ពិធីសែនចងដៃ និងពិសាអាហារថ្ងៃត្រង់ (Two hands tied with blessing thread)
      return (
        <svg
          viewBox="0 0 64 48"
          className="timeline-svg-icon"
          aria-hidden="true"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Royal Ceremonial Dagger / Sword (ព្រះខ័ន) */}
          <path
            d="M32 6 C30.5 6 30 7 30 8 C30 9.5 32 10.5 32 10.5 C32 10.5 34 9.5 34 8 C34 7 33.5 6 32 6 Z"
            fill={strokeColor}
            fillOpacity="0.25"
          />
          <path d="M24 13 H40 C38 11.5 36 11 32 11 C28 11 26 11.5 24 13 Z" />
          <path d="M30 13 L31 29 L32 32 L33 29 L34 13" />
          <path d="M32 13 V30" />
          {/* Two Hands Joined in Blessing / Union */}
          <path d="M18 36 C18 30 22 25 28 23" />
          <path d="M14 39 C14 32 19 28 26 27" />
          <path d="M46 36 C46 30 42 25 36 23" />
          <path d="M50 39 C50 32 45 28 38 27" />
          {/* Sacred Red Blessing Silk Thread (ខ្សែចងដៃ) */}
          <path d="M22 36 C26 33 30 38 32 36 C34 38 38 33 42 36" />
          <path d="M22 38 C27 35 30 40 32 38 C34 40 37 35 42 38" />
          <circle cx="32" cy="37" r="1.4" fill={strokeColor} />
          {/* Cascading Blessing Thread Tassels */}
          <path d="M30 38 C28 41 27 43 28 44" />
          <path d="M34 38 C36 41 37 43 36 44" />
        </svg>
      );

    case "umbrellas": // ០១:០០ ល្ងាច - កាត់ខាន់ស្លា (Traditional Cambodian ceremonial tiered umbrellas)
      return (
        <svg
          viewBox="0 0 64 48"
          className="timeline-svg-icon"
          aria-hidden="true"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Central Finial Spire */}
          <path d="M32 6 V10" />
          <circle cx="32" cy="6" r="1.4" fill={strokeColor} />
          {/* Tier 1 - Top Pagoda Canopy */}
          <path d="M26 14 C27 11 30 10 32 10 C34 10 37 11 38 14" />
          <path d="M25 14 Q28.5 16 32 14 Q35.5 16 39 14" />
          {/* Tier 2 - Middle Canopy */}
          <path d="M21 21 C23 16 28 15 32 15 C36 15 41 16 43 21" />
          <path d="M20 21 Q24 23 28 21 Q32 23 36 21 Q40 23 44 21" />
          {/* Tier 3 - Broad Lower Canopy */}
          <path d="M16 28 C19 22 25 21 32 21 C39 21 45 22 48 28" />
          <path d="M15 28 Q19.25 30.5 23.5 28 Q27.75 30.5 32 28 Q36.25 30.5 40.5 28 Q44.75 30.5 49 28" />
          {/* Golden Hanging Bead Pendants */}
          <circle cx="23.5" cy="30.5" r="0.9" fill={strokeColor} />
          <circle cx="32" cy="30.5" r="0.9" fill={strokeColor} />
          <circle cx="40.5" cy="30.5" r="0.9" fill={strokeColor} />
          {/* Ceremonial Staff Pole & Lotus Stand */}
          <path d="M32 28 V41" />
          <path d="M26 41 H38" />
          <path d="M28 41 L30 38 H34 L36 41" />
        </svg>
      );

    case "monks-blessing": // ០២:០០ ល្ងាច - សូត្រមន្ត (Buddhist blessing with lotus, holy water & incense)
      return (
        <svg
          viewBox="0 0 64 48"
          className="timeline-svg-icon"
          aria-hidden="true"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Blooming Sacred Khmer Lotus (ផ្កាឈូក) */}
          <path d="M16 38 C16 31 24 30 32 34 C40 30 48 31 48 38" />
          <path d="M14 39 H50" />
          {/* Layered Symmetrical Lotus Petals */}
          <path d="M17 35 C15 28 20 24 26 27" />
          <path d="M47 35 C49 28 44 24 38 27" />
          <path d="M23 32 C23 24 28 21 32 24 C36 21 41 24 41 32" />
          {/* Holy Water Vessel (ផ្តិលទឹកមន្ត) */}
          <path d="M26 23 H38 L36 29 H28 Z" />
          {/* Sprig of Sacred Blessed Leaves (ស្លឹកប្រោះព្រំ) */}
          <path d="M32 23 V14" />
          <path d="M32 18 C30 16 28 16 27 18 M32 18 C34 16 36 16 37 18" />
          <path d="M32 15 C30 13 29 13 28 15 M32 15 C34 13 35 13 36 15" />
          {/* Holy Blessing Aura Rays */}
          <path d="M22 12 C25 8 39 8 42 12" />
          <path d="M32 6 V9 M24 9 L26 11 M40 9 L38 11" />
        </svg>
      );

    case "champagne": // ០៥:០០ ល្ងាច - ពិសាភោជនីយអាហារ (Two elegant champagne glasses clinking with celebration heart)
    default:
      return (
        <svg
          viewBox="0 0 64 48"
          className="timeline-svg-icon"
          aria-hidden="true"
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Left Flute (Tilted slightly in toast) */}
          <path d="M21 16 L27 18 L26 28 C25.5 31 22 30.5 21 28 Z" />
          <path d="M23.5 30 L22 39" />
          <path d="M17 40 L27 38.5" />
          <path d="M22 21 L26 22" />
          {/* Right Flute (Tilted symmetrically) */}
          <path d="M43 16 L37 18 L38 28 C38.5 31 42 30.5 43 28 Z" />
          <path d="M40.5 30 L42 39" />
          <path d="M37 38.5 L47 40" />
          <path d="M42 21 L38 22" />
          {/* Clinking Toast Touch Point */}
          <path d="M27 18 L37 18" />
          {/* Celebratory Wedding Heart (បេះដូងមង្គល) */}
          <path
            d="M32 7 C30 4 26 5 27.5 8 C29 11 32 13 32 13 C32 13 35 11 36.5 8 C38 5 34 4 32 7 Z"
            fill={strokeColor}
            fillOpacity="0.2"
          />
          {/* Sparkling Bubbles */}
          <circle cx="28" cy="14" r="0.9" fill={strokeColor} />
          <circle cx="36" cy="14" r="0.9" fill={strokeColor} />
          <circle cx="32" cy="15" r="0.7" fill={strokeColor} />
          {/* Celebration Stars / Twinkles */}
          <path d="M17 11 L18 13 L20 14 L18 15 L17 17 L16 15 L14 14 L16 13 Z" />
          <path d="M47 11 L48 13 L50 14 L48 15 L47 17 L46 15 L44 14 L46 13 Z" />
        </svg>
      );
  }
};

/**
 * WeddingDetails Component
 * Presents the wedding date, live countdown timer, and horizontal ceremony timeline
 * in Khmer Traditional Luxury styling.
 */
export default function WeddingDetails() {
  const shouldReduceMotion = useReducedMotion();
  const { date, schedule } = invitationData;

  const topRowEvents = schedule.filter((item) => item.row === 1);
  const middleRowEvents = schedule.filter((item) => item.row === 2);
  const eveningRowEvents = schedule.filter((item) => item.row === 3);

  return (
    <section
      id="schedule"
      className="wedding-details-section"
      aria-label="Wedding Date and Ceremony Schedule"
    >
      {/* Section Header */}
      <ScrollReveal
        className="section-heading"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        <h2 className="section-title-khmer font-khmer-moul">
          កាលបរិច្ឆេទនិងកម្មវិធីមង្គលការ
        </h2>
        <p
          className="section-subtitle font-serif"
          style={{ letterSpacing: "2px" }}
        >
          SAVE THE SPECIAL DATE
        </p>
      </ScrollReveal>

      {/* Reusable Khmer Divider */}
      <div className="khmer-divider" aria-hidden="true">
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>

      {/* Date Showcase Card */}
      <ScrollReveal
        className="date-showcase-card"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        <div className="date-calendar-badge">
          <span className="calendar-month font-serif">
            DECEMBER &bull; ធ្នូ
          </span>
          <span className="calendar-day font-serif">18</span>
          <span className="calendar-year font-serif">2026</span>
        </div>

        <div className="date-showcase-text">
          <p className="date-full-kh font-khmer">{date.displayDateKhmer}</p>
          <p className="date-full-en font-serif">{date.displayDateEnglish}</p>
        </div>
      </ScrollReveal>

      {/* Live Countdown Component */}
      <Countdown />

      {/* Add to Calendar Interactive Action */}
      <AddToCalendar />

      {/* Reusable Khmer Divider */}
      <div
        className="khmer-divider"
        aria-hidden="true"
        style={{ margin: "1.75rem auto 1.25rem" }}
      >
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>

      {/* Schedule Timeline Section (Redesigned 3-3-2 Horizontal Timeline) */}
      <div className="schedule-timeline" aria-label="Ceremony Schedule List">
        <div className="schedule-header">
          <h3 className="schedule-title-kh font-khmer-moul">
            របៀបវិរៈកម្មវិធី
          </h3>
          <p className="schedule-title-en font-serif">
            EVENT AGENDA
          </p>
        </div>

        <ScrollReveal
          className="luxury-timeline-wrapper"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          threshold={0.15}
        >
          {/* Date Header inside Timeline Card */}
          <div className="luxury-timeline-date-header">
            <p className="timeline-date-kh font-khmer">
              {date.displayDateKhmer}
            </p>
            <p className="timeline-date-en font-serif">
              {date.displayDateEnglish}
            </p>
          </div>

          {/* === TRACK 1: MORNING & EARLY AFTERNOON (3 TOP + 3 BOTTOM) === */}
          <div className="timeline-track-block">
            <div className="timeline-grid-3">
              {topRowEvents.map((event) => (
                <div key={event.id} className="timeline-node-card is-above">
                  <div className="timeline-icon-box">
                    <CeremonyIcon type={event.icon} />
                  </div>
                  <div className="timeline-time-kh font-khmer">
                    {event.timeKhmer}
                  </div>
                  <div className="timeline-title-kh font-khmer">
                    {event.titleKhmer}
                  </div>
                  <div className="timeline-title-en font-serif">
                    {event.titleEnglish}
                  </div>
                  <div className="timeline-stem-down" />
                </div>
              ))}
            </div>

            {/* Horizontal Axis Line with 3 Burgundy-Gold Nodes */}
            <div className="timeline-horizontal-axis">
              <div className="timeline-axis-dots-3">
                <span className="timeline-dot" />
                <span className="timeline-dot" />
                <span className="timeline-dot" />
              </div>
            </div>

            <div className="timeline-grid-3">
              {middleRowEvents.map((event) => (
                <div key={event.id} className="timeline-node-card is-below">
                  <div className="timeline-stem-up" />
                  <div className="timeline-icon-box">
                    <CeremonyIcon type={event.icon} />
                  </div>
                  <div className="timeline-time-kh font-khmer">
                    {event.timeKhmer}
                  </div>
                  <div className="timeline-title-kh font-khmer">
                    {event.titleKhmer}
                  </div>
                  <div className="timeline-title-en font-serif">
                    {event.titleEnglish}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* === TRACK 2: EVENING CEREMONY & BANQUET (2 EVENTS) === */}
          <div className="timeline-track-block is-evening">
            <div className="timeline-grid-2">
              {eveningRowEvents.map((event) => (
                <div key={event.id} className="timeline-node-card is-above">
                  <div className="timeline-icon-box">
                    <CeremonyIcon type={event.icon} />
                  </div>
                  <div className="timeline-time-kh font-khmer">
                    {event.timeKhmer}
                  </div>
                  <div className="timeline-title-kh font-khmer">
                    {event.titleKhmer}
                  </div>
                  <div className="timeline-title-en font-serif">
                    {event.titleEnglish}
                  </div>
                  <div className="timeline-stem-down" />
                </div>
              ))}
            </div>

            {/* Horizontal Axis Line with 2 Burgundy-Gold Nodes */}
            <div className="timeline-horizontal-axis">
              <div className="timeline-axis-dots-2">
                <span className="timeline-dot" />
                <span className="timeline-dot" />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Reusable Khmer Divider */}
      <div
        className="khmer-divider"
        aria-hidden="true"
        style={{ marginTop: "1.5rem" }}
      >
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>
    </section>
  );
}
