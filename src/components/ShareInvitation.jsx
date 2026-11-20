import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Share2, Check, Copy } from "lucide-react";
import invitationData from "../data/invitation.js";

/**
 * ShareInvitation Component
 * Triggers native mobile sharing dialog (navigator.share) on iOS/Android,
 * or copies the invitation link to clipboard with instant toast feedback.
 */
export default function ShareInvitation() {
  const [copied, setCopied] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { sharing, couple, date } = invitationData;

  const shareTitle = `លិខិតអញ្ជើញអាពាហ៍ពិពាហ៍ | ${couple.groom.nameKhmer} & ${couple.bride.nameKhmer}`;
  const shareText = `សូមគោរពអញ្ជើញចូលរួមពិធីសិរីសួស្តីអាពាហ៍ពិពាហ៍ ${couple.groom.nameKhmer} & ${couple.bride.nameKhmer} នៅថ្ងៃទី ${date.displayDateKhmer}`;
  const shareUrl =
    typeof window !== "undefined" && window.location?.href
      ? window.location.href
      : sharing?.url || "https://tonghoursivminh-invitation.vercel.app";

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // If user cancelled, do nothing; if error, fall back to copy
        if (err.name === "AbortError") return;
      }
    }

    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Direct prompt fallback
      window.prompt("ចម្លងតំណភ្ជាប់លិខិតអញ្ជើញ / Copy link:", shareUrl);
    }
  };

  return (
    <div className="share-invitation-container">
      <motion.button
        type="button"
        className="luxury-share-btn font-serif"
        onClick={handleShare}
        aria-label="ចែករំលែកលិខិតអញ្ជើញ Share wedding invitation"
        whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.02 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="share-btn-icon-circle" aria-hidden="true">
          {copied ? (
            <Check size={18} className="share-btn-icon text-success" />
          ) : (
            <Share2 size={18} className="share-btn-icon" />
          )}
        </span>

        <span className="share-btn-text-wrap">
          <span className="share-btn-khmer font-khmer">
            {copied ? "បានចម្លងតំណភ្ជាប់!" : "ចែករំលែកលិខិតអញ្ជើញ"}
          </span>
          <span className="share-btn-english font-serif">
            {copied ? "LINK COPIED TO CLIPBOARD" : "SHARE INVITATION"}
          </span>
        </span>

        <span className="share-btn-arrow-circle" aria-hidden="true">
          <Copy size={14} className="share-arrow-icon" />
        </span>
      </motion.button>

      {/* Floating Toast Notification when copied */}
      <AnimatePresence>
        {copied && (
          <motion.div
            className="share-toast-notification font-khmer"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.22 }}
          >
            <Check size={16} className="toast-check-icon" />
            <span>បានចម្លងតំណភ្ជាប់លិខិតអញ្ជើញដោយជោគជ័យ!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
