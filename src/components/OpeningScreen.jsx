import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MailOpen, Sparkles, Loader2 } from "lucide-react";
import invitationData from "../data/invitation.js";

// Helper to determine if a guest name contains Khmer script
const isKhmerText = (text) => /[\u1780-\u17FF]/.test(text || "");

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

  // Local isOpening state to coordinate flap fold + card slide-up
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [isOpening, setIsOpening] = useState(false);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  }, [onOpen]);

  // Adjust state during render when isOpen prop changes (official React pattern)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setIsOpening(false);
    }
  }

  // Clean transition timer: call onOpen() after animation plays (~1300ms)
  // Uses onOpenRef so parent re-renders (e.g. audio starting) don't cancel the transition timer
  useEffect(() => {
    if (!isOpening || isOpen) return;
    const timer = setTimeout(() => {
      onOpenRef.current?.();
    }, 1300);
    return () => clearTimeout(timer);
  }, [isOpening, isOpen]);

  const handleStartOpen = () => {
    if (isOpening || isOpen) return;

    if (shouldReduceMotion) {
      onOpen?.();
      return;
    }

    // Step 1: Start audio synchronously on user gesture (satisfies mobile autoplay policy)
    onOpen?.({ immediateAudioOnly: true });

    // Step 2: Trigger opening animation
    setIsOpening(true);
  };

  const getLetterCardOffset = () => {
    if (typeof window === "undefined") return -145;
    const h = window.innerHeight;
    const w = window.innerWidth;
    if (h < 600) return -95;
    if (h < 700) return -120;
    if (w <= 480) return -145;
    return -170;
  };

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
          <div className="envelope-3d-scene envelope-container">
            <motion.div
              className={`envelope-realistic ${isOpening ? "is-opening" : ""}`}
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={
                !isOpening
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
                  : {
                      scale: 1,
                      opacity: 1,
                      y:
                        typeof window !== "undefined" &&
                        window.innerHeight < 680
                          ? 28
                          : 0,
                      transition: {
                        duration: 0.55,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    }
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
                  isOpening
                    ? { opacity: 0.7, scale: 1.1 }
                    : { opacity: 0, scale: 0.8 }
                }
                transition={{ delay: 0.25, duration: 0.65, ease: "easeOut" }}
                aria-hidden="true"
              />

              {/* Sliding Luxury Wedding Letter Card */}
              <motion.div
                className={`envelope-letter-card ${isOpening ? "is-sliding" : ""}`}
                initial={false}
                animate={
                  isOpening
                    ? {
                        y: getLetterCardOffset(),
                        opacity: 1,
                        scale: 1.02,
                        transition: {
                          delay: 0.28,
                          duration: 0.65,
                          ease: [0.16, 1, 0.3, 1],
                        },
                      }
                    : { y: 60, opacity: 0, scale: 0.96 }
                }
              >
                <div className="letter-card-inner">
                  <div className="letter-card-monogram-badge">
                    <div className="letter-card-monogram font-serif">
                      <span className="monogram-letter">{couple.groom.initial}</span>
                      <span className="monogram-ampersand">&amp;</span>
                      <span className="monogram-letter">{couple.bride.initial}</span>
                    </div>
                  </div>
                  <div className="letter-card-divider" aria-hidden="true">
                    ✦ ❖ ✦
                  </div>
                  <p className="letter-card-khmer font-khmer-moul">
                    សិរីសួស្តីអាពាហ៍ពិពាហ៍
                  </p>
                  <p className="letter-card-couple font-khmer">
                    {couple.groom.nameKhmer} &amp; {couple.bride.nameKhmer}
                  </p>
                  <p className="letter-card-couple-en font-serif">
                    {couple.groom.nameEnglish} &amp; {couple.bride.nameEnglish}
                  </p>
                  <p className="letter-card-date font-serif">
                    {date.displayShortDate}
                  </p>
                </div>
              </motion.div>

              {/* Hardware-Accelerated 3D Folding Top Flap */}
              <motion.div
                className={`envelope-top-flap-3d ${isOpening ? "is-open" : ""}`}
                initial={false}
                animate={
                  isOpening
                    ? {
                        rotateX: 180,
                        zIndex: [5, 5, 1],
                        transition: {
                          rotateX: {
                            duration: 0.55,
                            ease: [0.33, 1, 0.68, 1],
                          },
                          zIndex: {
                            duration: 0.55,
                            times: [0, 0.45, 0.46],
                          },
                        },
                      }
                    : { rotateX: 0, zIndex: 5 }
                }
              >
                {/* Flap Outer Face (visible when closed) */}
                <div className="flap-outer-face" />

                {/* Flap Inner Face (gold satin lining visible when flap flips up) */}
                <div className="flap-inner-face" aria-hidden="true" />

                {/* Wax Seal Medallion with Breathing Glow - centered at envelope-top-flap-3d apex */}
                <div className="envelope-seal-wrapper">
                  <motion.div
                    className={`envelope-seal ${!isOpening ? "is-breathing" : ""}`}
                    initial={false}
                    animate={
                      isOpening
                        ? {
                            scale: 1.1,
                            opacity: 0,
                            transition: { duration: 0.25, ease: "easeOut" },
                          }
                        : { scale: 1, opacity: 1 }
                    }
                    whileHover={
                      !isOpening && !shouldReduceMotion
                        ? {
                            scale: 1.08,
                            boxShadow: "0 0 24px rgba(181, 155, 109, 0.85)",
                          }
                        : {}
                    }
                    whileTap={
                      !isOpening && !shouldReduceMotion ? { scale: 0.94 } : {}
                    }
                    onClick={handleStartOpen}
                    role="button"
                    tabIndex={0}
                    aria-label="Click wax seal to open wedding invitation"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleStartOpen();
                      }
                    }}
                  >
                    <div className="seal-inner-rim">
                      <span className="seal-motif top">❖</span>
                      <span className="seal-monogram font-serif">
                        {couple.groom.initial}&amp;{couple.bride.initial}
                      </span>
                      <span className="seal-motif bottom">❖</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Envelope Front Pocket (Lower envelope body) */}
              <div className="envelope-pocket-front">
                <div className="pocket-fold-bottom">
                  {/* Front Text Branding */}
                  <div className="pocket-content">
                    {/* 1. Auspicious Title */}
                    <h1 className="envelope-title-khmer font-khmer-moul">
                      សិរីមង្គលអាពាហ៍ពិពាហ៍
                    </h1>

                    {/* 2. Invitation Prefix */}
                    <p className="envelope-invitation-prefix font-khmer">សូមគោរពអញ្ជើញ</p>

                    {/* 3. Dynamic Guest Name Plaque */}
                    <div
                      className="envelope-guest-plaque"
                      role="region"
                      aria-label="Personalized Guest Invitation Plaque"
                    >
                      <div className="guest-plaque-frame">
                        <div className="guest-plaque-inner">
                          <h2
                            className={`guest-plaque-name ${
                              isKhmerText(guest?.guest_name || "ភ្ញៀវកិត្តិយស")
                                ? "is-khmer font-khmer"
                                : "is-latin font-serif"
                            } ${(guest?.guest_name || "").length > 20 ? "is-long" : ""}`}
                          >
                            {guest?.guest_name || "ភ្ញៀវកិត្តិយស"}
                          </h2>
                          <div
                            className="guest-plaque-divider"
                            aria-hidden="true"
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* 4. Static Date in Khmer */}
                    <p className="envelope-date font-khmer">
                      ថ្ងៃសុក្រ ទី១៨ ខែធ្នូ ឆ្នាំ២០២៦ វេលាម៉ោង ៥:០០ ល្ងាច
                    </p>

                    {/* 6. Open Button: Luxury Wedding Invitation CTA */}
                    <motion.button
                      type="button"
                      className="envelope-open-btn font-serif"
                      onClick={handleStartOpen}
                      disabled={isOpening}
                      animate={
                        isOpening
                          ? { opacity: 0.45, scale: 0.98 }
                          : { opacity: 1, scale: 1 }
                      }
                      transition={{ duration: 0.25 }}
                      aria-label={
                        isOpening
                          ? "កំពុងបើកលិខិត Opening invitation"
                          : "បើកលិខិតអញ្ជើញ Open wedding invitation"
                      }
                      whileHover={
                        !isOpening && !shouldReduceMotion
                          ? {
                              y: -2,
                              scale: 1.02,
                            }
                          : {}
                      }
                      whileTap={
                        !isOpening && !shouldReduceMotion ? { scale: 0.98 } : {}
                      }
                    >
                      {/* Left Circular Container: Mail / Loading Icon */}
                      <span
                        className="envelope-btn-icon-circle"
                        aria-hidden="true"
                      >
                        {isOpening ? (
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
                          {isOpening ? "កំពុងបើក..." : "បើកលិខិត"}
                        </span>
                        <span className="envelope-btn-english font-serif">
                          {isOpening ? "OPENING..." : "OPEN INVITATION"}
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
