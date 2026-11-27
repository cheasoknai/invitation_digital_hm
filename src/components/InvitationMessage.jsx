import { useReducedMotion } from "framer-motion";
import invitationData from "../data/invitation.js";
import ScrollReveal from "./common/ScrollReveal.jsx";

/**
 * InvitationMessage Component
 * Displays the official hosts' invitation message and formal greeting.
 * Fully supports Khmer and English typography with comfortable, readable spacing.
 * Unboxed clean style with graceful forward-only scroll reveal animation.
 */
export default function InvitationMessage() {
  const { message } = invitationData;
  const shouldReduceMotion = useReducedMotion();

  if (!message) return null;

  return (
    <section
      className="invitation-message-section"
      aria-label="Official Invitation Message"
    >
      {/* Section Header */}
      <ScrollReveal
        className="section-heading"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        <h2 className="section-title-khmer font-khmer-moul">
          {message.invitationTitleKhmer || "យើងខ្ញុំមានកិត្តិយសសូមគោរពអញ្ជើញ"}
        </h2>
        <p
          className="section-subtitle font-serif"
          style={{ letterSpacing: "2px" }}
        >
          {message.invitationTitleEnglish || "WEDDING INVITATION"}
        </p>
      </ScrollReveal>

      {/* Reusable Khmer Divider */}
      <div className="khmer-divider" aria-hidden="true">
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>

      {/* Message Content (Clean unboxed style) */}
      <ScrollReveal
        className="message-content"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        {/* Khmer Official Message */}
        <div className="message-text-khmer font-khmer">
          <p>{message.greetingKhmer}</p>
        </div>

        {/* Divider inside message */}
        <div className="message-inner-divider" aria-hidden="true">
          <span className="divider-dot">&bull;</span>
          <span className="divider-ornament">❖</span>
          <span className="divider-dot">&bull;</span>
        </div>

        {/* English Official Message */}
        <div className="message-text-english font-serif">
          <p>{message.greetingEnglish}</p>
        </div>
      </ScrollReveal>

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
