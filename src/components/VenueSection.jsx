import { useReducedMotion, motion } from "framer-motion";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import invitationData from "../data/invitation.js";
import ScrollReveal from "./common/ScrollReveal.jsx";

/**
 * VenueSection Component
 * Displays wedding reception venue name, address, and interactive map directions with smooth forward-only scroll animation.
 */
export default function VenueSection() {
  const { venue } = invitationData;
  const shouldReduceMotion = useReducedMotion();

  const hasEmbedUrl = Boolean(
    venue.googleMapsEmbedUrl && venue.googleMapsEmbedUrl.trim() !== "",
  );

  // Formulate Google Maps Directions URL reading destination coordinates from venue config
  const directionsUrl =
    venue.latitude && venue.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}&travelmode=driving`
      : venue.directionsUrl || venue.googleMapsUrl || "https://maps.google.com";

  return (
    <section
      id="venue"
      className="venue-section"
      aria-label="Wedding Venue and Location"
    >
      {/* Section Header */}
      <ScrollReveal
        className="section-heading"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        <p className="section-subtitle font-serif">LOCATION &amp; DIRECTIONS</p>
        <h2 className="section-title-khmer font-khmer-moul">
          ទីតាំងប្រារព្ធពិធី
        </h2>
        <p
          className="section-subtitle font-serif"
          style={{ letterSpacing: "2px" }}
        >
          WEDDING VENUE
        </p>
      </ScrollReveal>

      {/* Reusable Khmer Divider */}
      <div className="khmer-divider" aria-hidden="true">
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>

      {/* Venue Showcase Card */}
      <ScrollReveal
        className="venue-card"
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        threshold={0.15}
      >
        {/* Map Pin Medallion */}
        <div className="venue-pin-badge" aria-hidden="true">
          <MapPin size={22} className="venue-pin-icon" />
        </div>

        {/* Venue Names */}
        <div className="venue-text-content">
          <h3 className="venue-name-kh font-khmer-moul">{venue.nameKhmer}</h3>
          <p className="venue-name-en font-serif">{venue.nameEnglish}</p>

          <div className="venue-address-divider" aria-hidden="true" />

          {/* Venue Addresses */}
          <p className="venue-address-kh font-khmer">{venue.addressKhmer}</p>
          <p className="venue-address-en font-serif">{venue.addressEnglish}</p>
        </div>

        {/* Optional Responsive Map Embed */}
        {hasEmbedUrl && (
          <div className="venue-map-embed-wrapper">
            <iframe
              src={venue.googleMapsEmbedUrl}
              title={`Google Map for ${venue.nameEnglish}`}
              className="venue-map-iframe"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        )}

        {/* Action Button: Luxury Wedding Directions Button */}
        <div className="venue-action-box">
          <motion.a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="luxury-directions-btn font-serif"
            aria-label={`មើលទិសដៅទៅកាន់ទីតាំងកម្មវិធី ${venue.nameKhmer || venue.nameEnglish} លើ Google Maps`}
            whileHover={
              shouldReduceMotion
                ? {}
                : {
                    y: -3,
                    scale: 1.02,
                  }
            }
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Subtle Circular Container with Navigation Icon */}
            <span className="directions-icon-circle" aria-hidden="true">
              <Navigation size={18} className="directions-nav-icon" />
            </span>

            {/* Refined Typography Stack */}
            <span className="directions-text-wrap">
              <span className="directions-label-kh font-khmer">
                មើលទីតាំងកម្មវិធី
              </span>
              <span className="directions-label-en font-serif">
                VIEW LOCATION &bull; GOOGLE MAPS
              </span>
            </span>

            {/* Subtle Circular Container with External Link Icon */}
            <span className="directions-arrow-circle" aria-hidden="true">
              <ExternalLink size={14} className="directions-ext-icon" />
            </span>
          </motion.a>

          <p className="venue-note font-khmer">
            សូមចុចប៊ូតុងខាងលើ ដើម្បីបើកមើលទីតាំងលើ Google Maps
          </p>
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
