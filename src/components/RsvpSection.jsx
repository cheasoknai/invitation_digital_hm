import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Send, HeartHandshake, Loader2, Check } from "lucide-react";
import { submitGuestRsvp } from "../lib/guestService.js";
import ScrollReveal from "./common/ScrollReveal.jsx";

/**
 * RsvpSection Component
 * Allows invited guests to view and submit their RSVP response directly on their personalized invitation.
 *
 * @param {object} [props.guest] - The invited guest record
 * @param {function} [props.onRsvpUpdated] - Callback after successful RSVP update
 */
export default function RsvpSection({ guest, onRsvpUpdated }) {
  const shouldReduceMotion = useReducedMotion();
  const [selectedStatus, setSelectedStatus] = useState(
    guest?.rsvp_status === "accepted" || guest?.rsvp_status === "declined"
      ? guest.rsvp_status
      : "accepted"
  );
  const [message, setMessage] = useState(guest?.rsvp_message || "");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!guest) {
    return (
      <section id="rsvp" className="rsvp-section" aria-label="RSVP Response">
        <ScrollReveal className="section-heading" threshold={0.15}>
          <p className="section-subtitle font-serif">RSVP &bull; ATTENDANCE</p>
          <h2 className="section-title-khmer font-khmer-moul">ការឆ្លើយតបការអញ្ជើញ</h2>
          <p className="section-subtitle font-serif" style={{ letterSpacing: "2px" }}>
            WEDDING ATTENDANCE
          </p>
        </ScrollReveal>

        <div className="khmer-divider" aria-hidden="true">
          <span className="divider-ornament">✦ ❖ ✦</span>
        </div>

        <ScrollReveal className="rsvp-card rsvp-general-card font-khmer" threshold={0.15}>
          <HeartHandshake size={36} className="rsvp-icon-accent" />
          <h3 className="rsvp-general-title font-khmer-moul">លិខិតអញ្ជើញទូទៅ</h3>
          <p className="rsvp-general-desc">
            សូមអរគុណសម្រាប់ការទស្សនាលិខិតអញ្ជើញអាពាហ៍ពិពាហ៍របស់យើងខ្ញុំ។
            ប្រសិនបើលោកអ្នកមានតំណភ្ជាប់ផ្ទាល់ខ្លួន (Personalized Invitation Link) សូមប្រើប្រាស់តំណភ្ជាប់នោះដើម្បីឆ្លើយតបការចូលរួម។
          </p>
          <p className="rsvp-general-contact font-serif">
            CONTACT HOSTS FOR PERSONALIZED RSVP
          </p>
        </ScrollReveal>

        <div className="khmer-divider" aria-hidden="true" style={{ marginTop: "1.5rem" }}>
          <span className="divider-ornament">✦ ❖ ✦</span>
        </div>
      </section>
    );
  }

  const handleRsvpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    const slug = guest?.invitation_slug;
    if (!slug) {
      setLoading(false);
      setFeedback({
        type: "error",
        text: "រកមិនឃើញលេខកូដសម្គាល់លិខិតអញ្ជើញ (Invalid or missing invitation slug).",
      });
      return;
    }

    const { data, error } = await submitGuestRsvp(
      slug,
      selectedStatus,
      message
    );

    setLoading(false);

    if (error || !data) {
      setFeedback({
        type: "error",
        text: "មានបញ្ហាក្នុងការបញ្ជាក់ការឆ្លើយតប។ សូមព្យាយាមម្តងទៀត។ (Failed to submit RSVP)",
      });
      return;
    }

    setFeedback({
      type: "success",
      text: selectedStatus === "accepted"
        ? "សូមអរគុណ! យើងខ្ញុំពិតជារីករាយដែលលោកអ្នកបានឆ្លើយតបចូលរួម។ (Thank you! Your attendance is confirmed.)"
        : "សូមអរគុណសម្រាប់ការឆ្លើយតបដំណឹងមកកាន់យើងខ្ញុំ។ (Thank you for letting us know.)",
    });

    if (onRsvpUpdated) {
      onRsvpUpdated(data);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "accepted":
        return (
          <span className="rsvp-status-badge badge-accepted font-khmer">
            <CheckCircle2 size={14} /> បានឆ្លើយតប៖ ចូលរួម (Attending)
          </span>
        );
      case "declined":
        return (
          <span className="rsvp-status-badge badge-declined font-khmer">
            <XCircle size={14} /> បានឆ្លើយតប៖ មិនអាចចូលរួម (Cannot Attend)
          </span>
        );
      default:
        return (
          <span className="rsvp-status-badge badge-pending font-khmer">
            <Clock size={14} /> មិនទាន់ឆ្លើយតប (Pending Response)
          </span>
        );
    }
  };

  return (
    <section id="rsvp" className="rsvp-section" aria-label="RSVP Response">
      <ScrollReveal className="section-heading" threshold={0.15}>
        <p className="section-subtitle font-serif">RSVP &bull; ATTENDANCE</p>
        <h2 className="section-title-khmer font-khmer-moul">ការឆ្លើយតបការអញ្ជើញ</h2>
        <p className="section-subtitle font-serif" style={{ letterSpacing: "2px" }}>
          WILL YOU ATTEND?
        </p>
      </ScrollReveal>

      <div className="khmer-divider" aria-hidden="true">
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>

      <ScrollReveal className="rsvp-card" threshold={0.15}>
        {/* Guest Personalized Greeting */}
        <div className="rsvp-guest-header">
          <p className="rsvp-guest-label font-serif">CORDIALLY INVITED GUEST</p>
          <h3 className="rsvp-guest-name font-khmer-moul">{guest.guest_name}</h3>
          <div className="rsvp-current-status-wrap">
            {getStatusBadge(guest.rsvp_status)}
          </div>
        </div>

        <form onSubmit={handleRsvpSubmit} className="rsvp-form">
          <label className="rsvp-form-label font-khmer">
            សូមជ្រើសរើសការឆ្លើយតបរបស់លោកអ្នក / Please select your attendance:
          </label>

          {/* Action Choice Buttons */}
          <div className="rsvp-choices-grid">
            <button
              type="button"
              className={`rsvp-choice-btn font-khmer ${selectedStatus === "accepted" ? "is-selected-accept" : ""}`}
              onClick={() => setSelectedStatus("accepted")}
            >
              <CheckCircle2 size={20} className="choice-icon" />
              <span className="choice-text">
                <span className="choice-kh">ចូលរួម</span>
                <span className="choice-en font-serif">ATTENDING</span>
              </span>
            </button>

            <button
              type="button"
              className={`rsvp-choice-btn font-khmer ${selectedStatus === "declined" ? "is-selected-decline" : ""}`}
              onClick={() => setSelectedStatus("declined")}
            >
              <XCircle size={20} className="choice-icon" />
              <span className="choice-text">
                <span className="choice-kh">មិនអាចចូលរួម</span>
                <span className="choice-en font-serif">CANNOT ATTEND</span>
              </span>
            </button>
          </div>

          {/* Optional Message Field */}
          <div className="rsvp-input-group">
            <label htmlFor="rsvp-message" className="rsvp-input-label font-khmer">
              ពាក្យជូនពរ ឬកំណត់ចំណាំ (បើមាន) / Blessing or note for couple:
            </label>
            <textarea
              id="rsvp-message"
              className="rsvp-textarea font-khmer"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="សូមសរសេរពាក្យជូនពរនៅទីនេះ... / Write a wish for TongHour & SivMinh..."
              maxLength={500}
            />
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`rsvp-feedback-box font-khmer ${feedback.type === "success" ? "feedback-success" : "feedback-error"}`}>
              {feedback.text}
            </div>
          )}

          {/* Submit Button: Luxury Wedding RSVP CTA matching Venue/Directions button style */}
          <motion.button
            type="submit"
            className="rsvp-submit-btn font-serif"
            disabled={loading}
            aria-label={
              loading
                ? "កំពុងបញ្ជាក់... Submitting RSVP"
                : "បញ្ជាក់ការឆ្លើយតប Confirm RSVP attendance"
            }
            whileHover={
              !loading && !shouldReduceMotion
                ? { y: -2, scale: 1.02 }
                : {}
            }
            whileTap={
              !loading && !shouldReduceMotion
                ? { scale: 0.98 }
                : {}
            }
          >
            {/* Left Circular Medallion with Send / Loading Icon */}
            <span className="rsvp-btn-icon-circle" aria-hidden="true">
              {loading ? (
                <Loader2 size={18} className="rsvp-btn-spinner" />
              ) : (
                <Send size={16} className="rsvp-btn-send-icon" />
              )}
            </span>

            {/* Central Typography Stack: Burgundy Khmer + Gold English */}
            <span className="rsvp-btn-text-wrap">
              <span className="rsvp-btn-khmer font-khmer">
                {loading ? "កំពុងបញ្ជាក់..." : "បញ្ជាក់ការឆ្លើយតប"}
              </span>
              <span className="rsvp-btn-english font-serif">
                {loading ? "SUBMITTING..." : "CONFIRM RSVP"}
              </span>
            </span>

            {/* Right Circular Accent Container */}
            <span className="rsvp-btn-action-circle" aria-hidden="true">
              <Check size={14} className="rsvp-btn-action-icon" />
            </span>
          </motion.button>
        </form>
      </ScrollReveal>

      <div className="khmer-divider" aria-hidden="true" style={{ marginTop: "1.5rem" }}>
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>
    </section>
  );
}
