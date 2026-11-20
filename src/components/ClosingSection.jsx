import { useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import invitationData from "../data/invitation.js";
import ScrollReveal from "./common/ScrollReveal.jsx";

/**
 * ClosingSection Component
 * Concludes the wedding invitation with a merged message of:
 * "សេចក្តីថ្លែងអំណរគុណ និងសូមខន្តីអភ័យទោស" (Gratitude & Sincere Apology)
 * followed by the ceremonial family sign-off and smooth forward-only scroll reveal animation.
 */
export default function ClosingSection() {
  const { message, couple } = invitationData;
  const shouldReduceMotion = useReducedMotion();

  const titleKhmer =
    message.closingTitleKhmer || "សេចក្តីថ្លែងអំណរគុណ និងសូមអភ័យទោស";
  const titleEnglish =
    message.closingTitleEnglish || "GRATITUDE & SINCERE APOLOGY";

  const combinedKhmer =
    message.closingCombinedKhmer ||
    `${message.gratitudeKhmer || message.closingKhmer} ${message.apologyKhmer || ""}`;

  const combinedEnglish =
    message.closingCombinedEnglish ||
    `${message.gratitudeEnglish || message.closingEnglish} ${message.apologyEnglish || ""}`;

  return (
    <footer
      className="closing-section"
      aria-label="Closing Gratitude and Apology"
    >
      <ScrollReveal
        className="closing-card"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        {/* Heart Medallion */}
        <div className="closing-heart-badge" aria-hidden="true">
          <Heart size={22} className="closing-heart-icon" />
        </div>

        {/* Section Heading: Merged Gratitude & Apology */}
        <div className="closing-header">
          <p className="closing-eyebrow font-serif">{titleEnglish}</p>
          <h2 className="closing-title-kh font-khmer-moul">{titleKhmer}</h2>
        </div>

        {/* Merged Message Block */}
        <div className="closing-merged-message">
          <p className="closing-text-kh font-khmer">{combinedKhmer}</p>

          {/* Divider inside message */}
          <div className="message-inner-divider" aria-hidden="true">
            <span className="divider-dot">&bull;</span>
            <span className="divider-ornament">❖</span>
            <span className="divider-dot">&bull;</span>
          </div>
          {combinedEnglish && (
            <p className="closing-text-en font-serif">{combinedEnglish}</p>
          )}
        </div>

        {/* Ceremonial Signature Block */}
        <div className="closing-signature-block">
          <p className="closing-respect-kh font-khmer">
            ដោយសេចក្តីគោរពរាប់អានដ៏ខ្ពង់ខ្ពស់ពីយើងខ្ញុំទាំងពីរគ្រួសារ
          </p>
          <p className="closing-respect-en font-serif">
            With warmest appreciation &amp; respect from both families
          </p>

          <div className="closing-names-box">
            <p className="closing-names-kh font-khmer-moul">
              {couple.groom.nameKhmer} &amp; {couple.bride.nameKhmer}
            </p>
            <p className="closing-names-en font-serif">
              {couple.groom.nameEnglish} &amp; {couple.bride.nameEnglish}
            </p>
          </div>
        </div>

        {/* Decorative Corner Accents */}
        <div className="photo-corner-accent top-left" aria-hidden="true" />
        <div className="photo-corner-accent top-right" aria-hidden="true" />
        <div className="photo-corner-accent bottom-left" aria-hidden="true" />
        <div className="photo-corner-accent bottom-right" aria-hidden="true" />
      </ScrollReveal>
    </footer>
  );
}
