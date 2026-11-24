import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MailOpen, Sparkles, Loader2 } from "lucide-react";
import invitationData from "../data/invitation.js";

/**
 * OpeningScreen Component
 * Cinematic 3D Envelope Opening & Romantic Reveal Experience.
 * Features:
 * - Gentle floating weightless idle entrance
 * - Subtle breathing golden glow on wax seal
 * - Anticipation touch feedback
 * - Hardware-accelerated 3D top flap with gold satin interior face
 * - Romantic golden halo glow behind rising letter card
 * - Clean staging to eliminate mobile frame drops and mounting bottlenecks
 * - Full prefers-reduced-motion accessibility support
 *
 * @param {boolean} isOpen - Whether the invitation has finished opening
 * @param {function} onOpen - Callback for audio trigger and open completion
 */
export default function OpeningScreen({ isOpen, onOpen, guest }) {
  const shouldReduceMotion = useReducedMotion();
  const { couple, date } = invitationData;

  // Animation stages: 'closed' | 'anticipating' | 'opening' | 'revealed' | 'dissolving' | 'opened'
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [animStage, setAnimStage] = useState(isOpen ? "opened" : "closed");
  const timersRef = useRef([]);

  // Adjust state during render when isOpen prop changes (official React pattern)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    setAnimStage(isOpen ? "opened" : "closed");
  }

  // Clear pending timers whenever isOpen prop changes or component unmounts
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, [isOpen]);

  const handleStartOpen = () => {
    if (animStage !== "closed") return;

    if (shouldReduceMotion) {
      setAnimStage("opened");
      onOpen({ complete: true });
      return;
    }

    // Step 1: Start audio synchronously on user gesture (satisfies iOS/Android autoplay policy)
    onOpen({ immediateAudioOnly: true });

    // Step 2: Brief anticipation phase (120ms) - seal glows and envelope takes a breath
    setAnimStage("anticipating");

    const t1 = setTimeout(() => {
      // Step 3: Trigger 3D flap opening, letter rise, and golden halo
      setAnimStage("opening");
    }, 120);

    const t2 = setTimeout(() => {
      // Step 4: Letter card is fully risen at rest - romantic view pause
      setAnimStage("revealed");
    }, 950);

    const t3 = setTimeout(() => {
      // Step 5: Begin cinematic dissolve and signal main invitation mount
      setAnimStage("dissolving");
      onOpen({ complete: true });
    }, 1350);

    const t4 = setTimeout(() => {
      // Step 6: Mark transition complete
      setAnimStage("opened");
    }, 1850);

    timersRef.current.push(t1, t2, t3, t4);
  };

  const isRising = animStage === "opening" || animStage === "revealed" || animStage === "dissolving";
  const isOpeningOrBeyond = animStage !== "closed" && animStage !== "anticipating";

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          className="opening-screen-overlay"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
          }}
          aria-modal="true"
          role="dialog"
          aria-label="Wedding Invitation Envelope Cover"
        >
          {/* Realistic 3D Envelope Scene */}
          <div className="envelope-3d-scene">
            <motion.div
              className={`envelope-realistic ${isOpeningOrBeyond ? "is-opening" : ""}`}
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={
                animStage === "closed"
                  ? {
                      scale: 1,
                      opacity: 1,
                      y: shouldReduceMotion ? 0 : [-3, 3, -3],
                      transition: {
                        y: {
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                        scale: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                        opacity: { duration: 0.5, ease: "easeOut" },
                      },
                    }
                  : animStage === "anticipating"
                  ? { scale: 0.99, opacity: 1, y: 2, transition: { duration: 0.12 } }
                  : { scale: 1, opacity: 1, y: 0, transition: { duration: 0.3 } }
              }
            >
              {/* Envelope Back Plate with High-Performance CSS Box Shadow */}
              <div className="envelope-back-plate" />

              {/* Envelope Inside Lining with subtle gold shimmer */}
              <div className="envelope-inner-lining" />

              {/* Romantic Golden Halo Glow behind Rising Letter */}
              <motion.div
                className="envelope-gold-glow"
                initial={false}
                animate={
                  isRising
                    ? { opacity: 0.7, scale: 1.1 }
                    : { opacity: 0, scale: 0.8 }
                }
                transition={{ duration: 0.6, ease: "easeOut" }}
                aria-hidden="true"
              />

              {/* Sliding Luxury Wedding Letter Card */}
              <motion.div
                className="envelope-letter-card"
                initial={false}
                animate={
                  isRising
                    ? {
                        y: typeof window !== "undefined" && window.innerWidth <= 480 ? -145 : -170,
                        scale: 1.02,
                        transition: {
                          delay: 0.18,
                          duration: 0.6,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }
                    : { y: 0, scale: 1 }
                }
              >
                <div className="letter-card-inner">
                  <div className="letter-card-monogram font-serif">
                    {couple.groom.initial} &amp; {couple.bride.initial}
                  </div>
                  <div className="letter-card-divider" aria-hidden="true">
                    ✦ ❖ ✦
                  </div>
                  <p className="letter-card-khmer font-khmer-moul">
                    សិរីសួស្តី អាពាហ៍ពិពាហ៍
                  </p>
                  <p className="letter-card-couple font-khmer">
                    {couple.groom.nameKhmer} &amp; {couple.bride.nameKhmer}
                  </p>
                  <p className="letter-card-couple-en font-serif">
                    {couple.groom.nameEnglish} &amp; {couple.bride.nameEnglish}
                  </p>
                  {guest?.guest_name && (
                    <div className="letter-card-guest-badge font-khmer">
                      <span className="guest-badge-pre">សូមគោរពអញ្ជើញ៖</span>
                      <span className="guest-badge-name">{guest.guest_name}</span>
                    </div>
                  )}
                  <p className="letter-card-date font-serif">
                    {date.displayShortDate}
                  </p>
                </div>
              </motion.div>

              {/* Hardware-Accelerated 3D Folding Top Flap */}
              <motion.div
                className={`envelope-top-flap-3d ${isOpeningOrBeyond ? "is-flipped" : ""}`}
                initial={false}
                animate={
                  isOpeningOrBeyond
                    ? {
                        rotateX: 180,
                        transition: {
                          duration: 0.55,
                          ease: [0.25, 1, 0.5, 1],
                        },
                      }
                    : { rotateX: 0 }
                }
              >
                {/* Flap Outer Face (visible when closed) */}
                <div className="flap-outer-face">
                  {/* Wax Seal Medallion with Breathing Glow */}
                  <motion.div
                    className={`envelope-seal ${animStage === "closed" ? "is-breathing" : ""}`}
                    animate={
                      animStage === "anticipating"
                        ? { scale: 1.08, opacity: 1 }
                        : isOpeningOrBeyond
                        ? {
                            scale: 0.6,
                            opacity: 0,
                            transition: { duration: 0.22, ease: "easeOut" },
                          }
                        : { scale: 1, opacity: 1 }
                    }
                    whileHover={
                      animStage === "closed"
                        ? {
                            scale: 1.08,
                            boxShadow: "0 0 22px rgba(181, 155, 109, 0.8)",
                          }
                        : {}
                    }
                    onClick={handleStartOpen}
                    role="button"
                    tabIndex={0}
                    aria-label="Click to open wedding invitation"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStartOpen();
                      }
                    }}
                  >
                    <span className="seal-motif">❖</span>
                    <span className="seal-monogram font-serif">
                      {couple.groom.initial}&amp;{couple.bride.initial}
                    </span>
                    <span className="seal-motif">❖</span>
                  </motion.div>
                </div>

                {/* Flap Inner Face (gold satin lining visible when flap flips up) */}
                <div className="flap-inner-face" aria-hidden="true" />
              </motion.div>

              {/* Envelope Front Pocket (Lower envelope body) */}
              <div className="envelope-pocket-front">
                <div className="pocket-fold-bottom">
                  {/* Front Text Branding */}
                  <div className="pocket-content">
                    {guest?.guest_name ? (
                      <div className="envelope-guest-card font-khmer">
                        <span className="envelope-guest-eyebrow font-serif">CORDIALLY INVITED</span>
                        <h2 className="envelope-guest-name font-khmer-moul">{guest.guest_name}</h2>
                      </div>
                    ) : (
                      <p className="envelope-eyebrow font-serif">
                        THE WEDDING CELEBRATION
                      </p>
                    )}
                    <h1 className="envelope-title-khmer font-khmer-moul">
                      សិរីសួស្តី អាពាហ៍ពិពាហ៍
                    </h1>
                    <p className="envelope-couple-names font-serif">
                      {couple.groom.nameEnglish} &amp;{" "}
                      {couple.bride.nameEnglish}
                    </p>
                    <p className="envelope-date-preview font-khmer">
                      {date.displayDateKhmer}
                    </p>

                    {/* Open Button: Luxury Wedding Invitation CTA */}
                    <motion.button
                      type="button"
                      className="envelope-open-btn font-serif"
                      onClick={handleStartOpen}
                      disabled={animStage !== "closed"}
                      animate={
                        animStage !== "closed"
                          ? { opacity: 0.45, scale: 0.98 }
                          : { opacity: 1, scale: 1 }
                      }
                      transition={{ duration: 0.25 }}
                      aria-label={
                        animStage !== "closed"
                          ? "កំពុងបើកលិខិត Opening invitation"
                          : "បើកលិខិតអញ្ជើញ Open wedding invitation"
                      }
                      whileHover={
                        animStage === "closed" && !shouldReduceMotion
                          ? {
                              y: -2,
                              scale: 1.02,
                            }
                          : {}
                      }
                      whileTap={
                        animStage === "closed" && !shouldReduceMotion
                          ? { scale: 0.98 }
                          : {}
                      }
                    >
                      {/* Left Circular Container: Mail / Loading Icon */}
                      <span
                        className="envelope-btn-icon-circle"
                        aria-hidden="true"
                      >
                        {animStage !== "closed" ? (
                          <Loader2 size={18} className="envelope-btn-spinner" />
                        ) : (
                          <MailOpen
                            size={18}
                            className="envelope-btn-mail-icon"
                          />
                        )}
                      </span>

                      {/* Refined Typography Stack */}
                      <span className="envelope-btn-text-wrap">
                        <span className="envelope-btn-khmer font-khmer">
                          {animStage !== "closed" ? "កំពុងបើក..." : "បើកលិខិត"}
                        </span>
                        <span className="envelope-btn-english font-serif">
                          {animStage !== "closed"
                            ? "OPENING..."
                            : "OPEN INVITATION"}
                        </span>
                      </span>

                      {/* Right Accent: Subtle Circular Badge with Sparkle */}
                      <span
                        className="envelope-btn-sparkle-circle"
                        aria-hidden="true"
                      >
                        <Sparkles size={14} className="envelope-btn-sparkle" />
                      </span>
                    </motion.button>

                    <p className="envelope-hint font-khmer">
                      សូមចុចប៊ូតុង ឬត្រាខាងលើ ដើម្បីបើកលិខិតអញ្ជើញ
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
