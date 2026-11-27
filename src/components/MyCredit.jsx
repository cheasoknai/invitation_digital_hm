import { useReducedMotion } from "framer-motion";
import invitationData from "../data/invitation.js";
import ScrollReveal from "./common/ScrollReveal.jsx";

/**
 * MyCredit Component
 * Elegant, luxury creator credit section in Khmer Traditional Luxury styling.
 * Highlights Chea Soknai with accessible, interactive social buttons for Facebook, Instagram, and Telegram.
 */
export default function MyCredit() {
  const shouldReduceMotion = useReducedMotion();
  const credit = invitationData?.credit || {
    label: "Invitation by",
    name: "Chea Soknai",
    tagline: "Make Invitation Comes Alive",

    socials: {
      facebook: "https://www.facebook.com/cheasoknai180506/",
      instagram: "https://www.instagram.com/nnnai_420/",
      telegram: "https://t.me/CSoknai",
    },
  };

  const { label, name, tagline, socials } = credit;

  return (
    <section className="credit-section" aria-label="Invitation Creator Credit">
      {/* Subtle Khmer Ornamental Divider */}
      <div className="credit-divider" aria-hidden="true">
        <span className="credit-divider-line" />
        <span className="credit-divider-ornament">✦ ❖ ✦</span>
        <span className="credit-divider-line" />
      </div>

      <ScrollReveal
        className="credit-content"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        {/* "Invitation by" */}
        <p className="credit-label font-serif">{label || "Invitation by"}</p>

        {/* "Chea Soknai" */}
        <h3 className="credit-name font-serif">{name || "Chea Soknai"}</h3>

        {/* "Make Invitation Comes Alive" */}
        <p className="credit-tagline font-serif">
          &ldquo;{tagline || "Make Invitation Comes Alive"}&rdquo;
        </p>

        {/* Interactive Social Media Profile Buttons */}
        <div
          className="credit-social-links"
          role="group"
          aria-label="Creator Social Media Links"
        >
          {/* Facebook */}
          <a
            href={
              socials?.facebook || "https://www.facebook.com/cheasoknai180506/"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="credit-social-btn btn-facebook"
            aria-label="Visit Chea Soknai on Facebook"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>

          {/* Instagram */}
          <a
            href={socials?.instagram || "https://www.instagram.com/nnnai_420/"}
            target="_blank"
            rel="noopener noreferrer"
            className="credit-social-btn btn-instagram"
            aria-label="Visit Chea Soknai on Instagram"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <circle
                cx="17.5"
                cy="6.5"
                r="1"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </a>

          {/* Telegram */}
          <a
            href={socials?.telegram || "https://t.me/CSoknai"}
            target="_blank"
            rel="noopener noreferrer"
            className="credit-social-btn btn-telegram"
            aria-label="Contact Chea Soknai on Telegram"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.674c.458 0 .661-.21.916-.457l2.199-2.138 4.574 3.38c.843.464 1.449.225 1.659-.785l2.997-14.125c.307-1.233-.473-1.792-1.277-1.427z" />
            </svg>
          </a>
        </div>
      </ScrollReveal>
    </section>
  );
}
