import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { MailOpen, Sparkles, Loader2 } from "lucide-react";
import invitationData from "../data/invitation.js";

/**
 * OpeningScreen Component
 * Realistic 3D Envelope Opening Animation & Cinematic Reveal Experience.
 * Features a 3D folding flap, sliding invitation card, seal pop, and seamless transition to the main invitation.
 *
 * @param {boolean} isOpen - Whether the invitation has finished opening
 * @param {function} onOpen - Callback when the guest opens the invitation (starts audio & sets open state)
 */
export default function OpeningScreen({ isOpen, onOpen }) {
  const shouldReduceMotion = useReducedMotion();
  const { couple, date } = invitationData;

  // Animation phase: 'closed' | 'opening' | 'opened'
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [animStage, setAnimStage] = useState(isOpen ? "opened" : "closed");

  // Adjust state during render when isOpen prop changes (official React pattern)
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    setAnimStage(isOpen ? "opened" : "closed");
  }

  const handleStartOpen = () => {
    if (animStage !== "closed") return;

    if (shouldReduceMotion) {
      setAnimStage("opened");
      onOpen();
      return;
    }

    // Step 1: Start audio immediately on direct user click (satisfies browser policy)
    onOpen({ immediateAudioOnly: true });

    // Step 2: Trigger realistic multi-stage 3D envelope opening
    setAnimStage("opening");

    // Step 3: Complete transition quickly after flap swings and card slides out
    setTimeout(() => {
      setAnimStage("opened");
      onOpen({ complete: true });
    }, 750);
  };

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          className="opening-screen-overlay"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.03,
            transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          }}
          aria-modal="true"
          role="dialog"
          aria-label="Wedding Invitation Envelope Cover"
        >
          {/* Realistic 3D Envelope Scene */}
          <div className="envelope-3d-scene">
            <motion.div
              className={`envelope-realistic ${animStage === "opening" ? "is-opening" : ""}`}
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{
                scale: 1,
                opacity: 1,
                y: 0,
                transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
              }}
            >
              {/* Envelope Back Plate */}
              <div className="envelope-back-plate" />

              {/* Envelope Inside Lining with subtle gold shimmer */}
              <div className="envelope-inner-lining" />

              {/* Sliding Invitation Letter Card */}
              <motion.div
                className="envelope-letter-card"
                initial={false}
                animate={
                  animStage === "opening"
                    ? {
                        y: -180,
                        scale: 1.02,
                        zIndex: 4,
                        transition: {
                          delay: 0.18,
                          duration: 0.5,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }
                    : { y: 0, scale: 1, zIndex: 1 }
                }
              >
                <div className="letter-card-inner">
                  <div className="letter-card-monogram font-serif">
                    {couple.groom.initial} &amp; {couple.bride.initial}
                  </div>
                  <p className="letter-card-khmer font-khmer-moul">
                    សិរីសួស្តី អាពាហ៍ពិពាហ៍
                  </p>
                  <p className="letter-card-couple font-khmer">
                    {couple.groom.nameKhmer} &amp; {couple.bride.nameKhmer}
                  </p>
                  <p className="letter-card-date font-serif">
                    {date.displayShortDate}
                  </p>
                </div>
              </motion.div>

              {/* 3D Folding Top Flap */}
              <motion.div
                className="envelope-top-flap-3d"
                initial={false}
                animate={
                  animStage === "opening"
                    ? {
                        rotateX: 180,
                        zIndex: 0,
                        transition: {
                          duration: 0.38,
                          ease: [0.33, 1, 0.68, 1],
                        },
                      }
                    : { rotateX: 0, zIndex: 5 }
                }
              >
                {/* Flap Outer Triangle */}
                <div className="flap-outer-face">
                  {/* Wax Seal Medallion attached to the flap tip */}
                  <motion.div
                    className="envelope-seal"
                    animate={
                      animStage === "opening"
                        ? {
                            scale: 0.4,
                            opacity: 0,
                            transition: { duration: 0.2 },
                          }
                        : { scale: 1, opacity: 1 }
                    }
                    whileHover={
                      animStage === "closed"
                        ? {
                            scale: 1.08,
                            boxShadow: "0 0 20px rgba(181, 155, 109, 0.7)",
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
              </motion.div>

              {/* Envelope Front Pocket (Covers bottom & sides of card) */}
              <div className="envelope-pocket-front">
                <div className="pocket-fold-left" />
                <div className="pocket-fold-right" />
                <div className="pocket-fold-bottom">
                  {/* Front Text Branding */}
                  <div className="pocket-content">
                    <p className="envelope-eyebrow font-serif">
                      THE WEDDING CELEBRATION
                    </p>
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
                      disabled={animStage === "opening"}
                      aria-label={
                        animStage === "opening"
                          ? "កំពុងបើកលិខិត Opening invitation"
                          : "បើកលិខិតអញ្ជើញ Open wedding invitation"
                      }
                      whileHover={
                        shouldReduceMotion
                          ? {}
                          : {
                              y: -2,
                              scale: 1.02,
                            }
                      }
                      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* Left Circular Container: Mail / Loading Icon */}
                      <span
                        className="envelope-btn-icon-circle"
                        aria-hidden="true"
                      >
                        {animStage === "opening" ? (
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
                          {animStage === "opening" ? "កំពុងបើក..." : "បើកលិខិត"}
                        </span>
                        <span className="envelope-btn-english font-serif">
                          {animStage === "opening"
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
