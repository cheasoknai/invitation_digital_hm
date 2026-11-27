import { useState } from "react";
import { useReducedMotion, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Gift, QrCode, Download, Copy, Check } from "lucide-react";
import invitationData from "../data/invitation.js";
import ScrollReveal from "./common/ScrollReveal.jsx";

/**
 * GiftQRCode Component
 * Presents the wedding gift QR code for "ចងដៃ" (Chong Dai) monetary blessings.
 * Renders either the owner-supplied official QR image or a dynamic QR code via qrcode.react.
 * Features smooth scroll entrance and interactive hover effects.
 */
export default function GiftQRCode() {
  const { giftQR } = invitationData;
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  if (!giftQR || !giftQR.enabled) return null;

  const handleCopyAccount = async () => {
    const textToCopy = [
      giftQR.accountName,
      giftQR.accountNumber,
      giftQR.bankName,
    ]
      .filter(Boolean)
      .join(" - ");

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("ចម្លងព័ត៌មានគណនី / Copy account info:", textToCopy);
    }
  };

  const handleDownloadQR = async () => {
    if (!giftQR.imageSrc) return;
    try {
      const res = await fetch(giftQR.imageSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "SivMinh_Wedding_KHQR.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement("a");
      link.href = giftQR.imageSrc;
      link.download = "SivMinh_Wedding_KHQR.jpg";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isDynamicQR =
    (giftQR.type === "url" || giftQR.type === "payload") &&
    Boolean(giftQR.payload && giftQR.payload.trim() !== "");

  const isOfficialImage =
    giftQR.type === "image" && Boolean(giftQR.imageSrc) && !imageError;

  return (
    <section
      id="gift"
      className="gift-qr-section"
      aria-label="Wedding Gift and Chong Dai QR Code"
    >
      {/* Section Header */}
      <ScrollReveal
        className="section-heading"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        <p className="section-subtitle font-serif">
          WEDDING BLESSINGS
        </p>
        <h2 className="section-title-khmer font-khmer-moul">
          ចំណងដៃ
        </h2>
        <p
          className="section-subtitle font-serif"
          style={{ letterSpacing: "2px" }}
        >
          WEDDING GIFT
        </p>
      </ScrollReveal>

      {/* Reusable Khmer Divider */}
      <div className="khmer-divider" aria-hidden="true">
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>

      {/* Main Gift QR Card */}
      <ScrollReveal
        className="gift-qr-card"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        {/* Gift Icon Medallion */}
        <div className="gift-icon-badge" aria-hidden="true">
          <Gift size={24} className="gift-badge-icon" />
        </div>

        {/* Polite Explanation / Captions */}
        <div className="gift-text-block">
          <p className="gift-caption-kh font-khmer">{giftQR.captionKhmer}</p>
          <p className="gift-caption-en font-serif">{giftQR.captionEnglish}</p>
        </div>

        {/* QR Code Frame */}
        <div className="gift-qr-display-frame">
          {isDynamicQR ? (
            /* 1. Dynamic QR Code generated via qrcode.react */
            <div className="qr-code-svg-wrap">
              <QRCodeSVG
                value={giftQR.payload}
                size={210}
                level="H"
                bgColor="#FFFFFF"
                fgColor="#631A26"
                includeMargin={true}
                className="qr-code-svg-element"
              />
            </div>
          ) : isOfficialImage ? (
            /* 2. Official static QR Image file supplied by host */
            <div className="qr-code-image-wrap">
              <img
                src={giftQR.imageSrc}
                alt="Wedding Gift QR Code"
                className="qr-code-actual-img"
                loading="lazy"
                decoding="async"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            /* 3. Luxury Fallback / Instructions if image not yet loaded */
            <div className="qr-code-placeholder-card" aria-hidden="true">
              <QrCode size={48} className="qr-placeholder-icon" />
              <p className="qr-placeholder-label font-khmer">
                {giftQR.accountName || "គណនីចំណងដៃអាពាហ៍ពិពាហ៍"}
              </p>
              <p className="qr-placeholder-sub font-serif">
                QR CODE READY &bull; ABA / KHQR
              </p>
            </div>
          )}

          {/* Traditional Khmer Corner Ornaments */}
          <div className="photo-corner-accent top-left" aria-hidden="true" />
          <div className="photo-corner-accent top-right" aria-hidden="true" />
          <div className="photo-corner-accent bottom-left" aria-hidden="true" />
          <div
            className="photo-corner-accent bottom-right"
            aria-hidden="true"
          />
        </div>

        {/* Account Name & Bank Details (Only displayed if provided by host) */}
        {(giftQR.accountName || giftQR.accountNumber) && (
          <div className="gift-account-meta">
            {giftQR.accountName && (
              <p className="gift-account-name font-serif">
                {giftQR.accountName}
              </p>
            )}
            {giftQR.accountNumber && (
              <p className="gift-account-number font-serif">
                {giftQR.accountNumber}
              </p>
            )}
          </div>
        )}

        {/* Interactive Chong Dai Action Buttons */}
        <div className="gift-action-row">
          {giftQR.imageSrc && (
            <motion.button
              type="button"
              className="gift-action-btn font-serif"
              onClick={handleDownloadQR}
              aria-label="ទាញយក QR Code រក្សាទុកក្នុងទូរសព្ទ Download QR Code image"
              whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.02 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            >
              <span className="gift-action-icon-circle" aria-hidden="true">
                <Download size={15} />
              </span>
              <span className="gift-action-text-wrap">
                <span className="gift-action-kh font-khmer">រក្សាទុក QR</span>
                <span className="gift-action-en font-serif">SAVE QR CODE</span>
              </span>
            </motion.button>
          )}

          {(giftQR.accountName || giftQR.accountNumber) && (
            <motion.button
              type="button"
              className={`gift-action-btn font-serif ${copied ? "is-copied" : ""}`}
              onClick={handleCopyAccount}
              aria-label="ចម្លងព័ត៌មានគណនី Copy account details"
              whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.02 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            >
              <span className="gift-action-icon-circle" aria-hidden="true">
                {copied ? (
                  <Check size={15} color="#4ade80" />
                ) : (
                  <Copy size={15} />
                )}
              </span>
              <span className="gift-action-text-wrap">
                <span className="gift-action-kh font-khmer">
                  {copied ? "បានចម្លង!" : "ចម្លងព័ត៌មាន"}
                </span>
                <span className="gift-action-en font-serif">
                  {copied ? "COPIED" : "COPY INFO"}
                </span>
              </span>
            </motion.button>
          )}
        </div>

        {/* Chong Dai Traditional Blessing Tag */}
        <div className="gift-blessing-tag font-khmer" aria-hidden="true">
          <span>❖ សូមថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅ ❖</span>
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
