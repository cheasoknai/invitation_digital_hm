import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import invitationData from "../data/invitation.js";
import ScrollReveal from "./common/ScrollReveal.jsx";

/**
 * CoupleSection Component
 * Presents the Groom and Bride with Khmer Traditional Luxury styling,
 * cinematic entrance animations, photo frame accents, and responsive layout.
 */
export default function CoupleSection() {
  const { couple } = invitationData;
  const { groom, bride } = couple;
  const shouldReduceMotion = useReducedMotion();

  // Track active image sources with automatic fallback from optimized WebP to original JPEG
  const [groomSrc, setGroomSrc] = useState(groom.photo);
  const [brideSrc, setBrideSrc] = useState(bride.photo);
  const [groomImgError, setGroomImgError] = useState(false);
  const [brideImgError, setBrideImgError] = useState(false);

  const handleGroomError = () => {
    if (groomSrc !== groom.originalPhoto && groom.originalPhoto) {
      setGroomSrc(groom.originalPhoto);
    } else {
      setGroomImgError(true);
    }
  };

  const handleBrideError = () => {
    if (brideSrc !== bride.originalPhoto && bride.originalPhoto) {
      setBrideSrc(bride.originalPhoto);
    } else {
      setBrideImgError(true);
    }
  };

  return (
    <section
      id="couple"
      className="couple-section"
      aria-label="Groom and Bride Introduction"
    >
      {/* Section Header with Forward-Only Entrance */}
      <ScrollReveal
        className="section-heading"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        <p className="section-subtitle font-serif">THE HAPPY COUPLE</p>
        <h2 className="section-title-khmer font-khmer-moul">
          គូស្វាមីភរិយាថ្មី
        </h2>
        <p
          className="section-subtitle font-serif"
          style={{ letterSpacing: "2px" }}
        >
          GROOM &amp; BRIDE
        </p>
      </ScrollReveal>

      {/* Decorative Khmer Divider */}
      <div className="khmer-divider" aria-hidden="true">
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>

      {/* Couple Grid: Side-by-side with cinematic entrance */}
      <div className="couple-grid">
        {/* Groom Card */}
        <ScrollReveal
          as={motion.article}
          className="couple-card"
          initial={shouldReduceMotion ? {} : { opacity: 0, x: -40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          threshold={0.15}
        >
          <motion.div
            className="couple-photo-frame"
            whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            {!groomImgError && groomSrc ? (
              <img
                src={groomSrc}
                alt={`កូនកំលោះ ${groom.nameKhmer} (${groom.nameEnglish})`}
                className="couple-photo-img"
                width="1200"
                height="1800"
                decoding="async"
                onError={handleGroomError}
                loading="lazy"
              />
            ) : (
              <div className="couple-photo-placeholder" aria-hidden="true">
                <span className="placeholder-ornament">❖</span>
                <span className="placeholder-initial font-serif">
                  {groom.initial}
                </span>
                <span className="placeholder-tag font-khmer">
                  រូបថតកូនកំលោះ
                </span>
              </div>
            )}
            <div className="photo-corner-accent top-left" aria-hidden="true" />
            <div className="photo-corner-accent top-right" aria-hidden="true" />
            <div
              className="photo-corner-accent bottom-left"
              aria-hidden="true"
            />
            <div
              className="photo-corner-accent bottom-right"
              aria-hidden="true"
            />
          </motion.div>

          <div className="couple-info">
            <span className="couple-role-tag font-khmer">កូនប្រុសនាម</span>
            <span className="couple-role-en font-serif">THE GROOM</span>

            <h3 className="couple-name-kh font-khmer-moul">
              {groom.nameKhmer}
            </h3>
            <p className="couple-name-en font-serif">{groom.nameEnglish}</p>
          </div>
        </ScrollReveal>

        {/* Central Monogram Connector */}
        <ScrollReveal
          className="couple-connector"
          aria-hidden="true"
          initial={shouldReduceMotion ? {} : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          threshold={0.15}
        >
          <div className="connector-line" />
          <div className="connector-seal">
            <span className="connector-ampersand font-serif">&amp;</span>
          </div>
          <div className="connector-line" />
        </ScrollReveal>

        {/* Bride Card */}
        <ScrollReveal
          as={motion.article}
          className="couple-card"
          initial={shouldReduceMotion ? {} : { opacity: 0, x: 40, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          threshold={0.15}
        >
          <motion.div
            className="couple-photo-frame"
            whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            {!brideImgError && brideSrc ? (
              <img
                src={brideSrc}
                alt={`កូនក្រមុំ ${bride.nameKhmer} (${bride.nameEnglish})`}
                className="couple-photo-img"
                width="1200"
                height="1800"
                decoding="async"
                onError={handleBrideError}
                loading="lazy"
              />
            ) : (
              <div className="couple-photo-placeholder" aria-hidden="true">
                <span className="placeholder-ornament">❖</span>
                <span className="placeholder-initial font-serif">
                  {bride.initial}
                </span>
                <span className="placeholder-tag font-khmer">
                  រូបថតកូនក្រមុំ
                </span>
              </div>
            )}
            <div className="photo-corner-accent top-left" aria-hidden="true" />
            <div className="photo-corner-accent top-right" aria-hidden="true" />
            <div
              className="photo-corner-accent bottom-left"
              aria-hidden="true"
            />
            <div
              className="photo-corner-accent bottom-right"
              aria-hidden="true"
            />
          </motion.div>

          <div className="couple-info">
            <span className="couple-role-tag font-khmer">កូនស្រីនាម</span>
            <span className="couple-role-en font-serif">THE BRIDE</span>

            <h3 className="couple-name-kh font-khmer-moul">
              {bride.nameKhmer}
            </h3>
            <p className="couple-name-en font-serif">{bride.nameEnglish}</p>
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
