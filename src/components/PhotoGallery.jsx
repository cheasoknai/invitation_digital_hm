import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import invitationData from "../data/invitation.js";
import { useRowScrollAnimation } from "../hooks/useScrollAnimation.js";

/**
 * Calculates the grid row index for each photo in the 2-column masonry/banner layout.
 * Ensures both images in each side-by-side row share the exact same row index and animate synchronously.
 * Repeating 8-item pattern:
 * Row 0: Photo 1 (span 2)
 * Row 1: Photos 2 & 3 (span 1 each, side-by-side)
 * Row 2: Photo 4 (span 2)
 * Row 3: Photos 5 & 6 (span 1 each, side-by-side)
 * Row 4: Photos 7 & 8 (span 1 each, side-by-side)
 */
function getGalleryRowIndex(index) {
  const block = Math.floor(index / 8);
  const rem = index % 8;
  let rowInBlock;
  if (rem === 0) rowInBlock = 0;
  else if (rem <= 2) rowInBlock = 1;
  else if (rem === 3) rowInBlock = 2;
  else if (rem <= 5) rowInBlock = 3;
  else rowInBlock = 4;
  return block * 5 + rowInBlock;
}

/**
 * PhotoGallery Component
 * Displays Pre-Wedding photo gallery with Khmer Traditional Luxury styling,
 * smooth scroll entrance, full touch swipe navigation on mobile, and responsive lightbox.
 *
 * Performance & Optimization Architecture:
 * - Gallery Grid: Renders lightweight WebP thumbnails (~30-50KB) with loading="lazy" & decoding="async".
 * - Lightbox Modal: Loads high-quality optimized WebP (~200-450KB) on demand with decoding="async".
 * - Adjacent Preload: Intelligently preloads prev & next full-size images only while lightbox is open.
 * - Independent Error Handling: Grid thumbnail failures show luxury placeholders without blocking the lightbox;
 *   Lightbox errors gracefully attempt fallback to original JPEG before displaying the fallback placeholder.
 */
export default function PhotoGallery() {
  const { gallery } = invitationData;
  const shouldReduceMotion = useReducedMotion();

  // Forward-only row scroll animation synchronizer with pre-trigger lookahead
  const { rowVisibility, registerRowElement } = useRowScrollAnimation({
    threshold: 0.02,
    rootMargin: "80px 0px 40px 0px",
  });

  // State: active photo index in lightbox (null = closed)
  const [activeIndex, setActiveIndex] = useState(null);
  // Track direction of slide in lightbox: 1 for next, -1 for prev
  const [slideDirection, setSlideDirection] = useState(0);

  // Independent error states
  // 1. Grid thumbnail errors: displays existing luxury placeholder in grid
  const [thumbnailErrors, setThumbnailErrors] = useState({});
  // 2. Lightbox fallback tracker: when optimized WebP fails, try original JPEG
  const [lightboxFallbackActive, setLightboxFallbackActive] = useState({});
  // 3. Lightbox permanent error: both optimized WebP and original JPEG failed
  const [lightboxErrors, setLightboxErrors] = useState({});

  // Set of URLs already preloaded to prevent redundant Image object allocations
  const preloadedUrls = useRef(new Set());

  // Touch tracking for mobile swipe
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const isOpen = activeIndex !== null;
  const totalPhotos = gallery?.length || 0;
  const currentPhoto = isOpen ? gallery[activeIndex] : null;

  // Grid thumbnail error handler
  const handleThumbnailError = useCallback((id) => {
    setThumbnailErrors((prev) => ({ ...prev, [id]: true }));
  }, []);

  // Lightbox error handler with graceful fallback to original JPEG
  const handleLightboxError = useCallback(
    (photo) => {
      if (!photo) return;
      const { id, original, src } = photo;

      // If optimized WebP failed and we haven't tried the original JPEG fallback yet
      if (!lightboxFallbackActive[id] && original && original !== src) {
        setLightboxFallbackActive((prev) => ({ ...prev, [id]: true }));
      } else {
        // Original either failed or is unavailable: show luxury placeholder in modal
        setLightboxErrors((prev) => ({ ...prev, [id]: true }));
      }
    },
    [lightboxFallbackActive],
  );

  // Determine current active source for lightbox
  const getLightboxSrc = useCallback(
    (photo) => {
      if (!photo) return "";
      if (lightboxFallbackActive[photo.id] && photo.original) {
        return photo.original;
      }
      return photo.src;
    },
    [lightboxFallbackActive],
  );

  // Lightbox Navigation Functions
  const handleClose = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handlePrev = useCallback(() => {
    setSlideDirection(-1);
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalPhotos - 1));
  }, [totalPhotos]);

  const handleNext = useCallback(() => {
    setSlideDirection(1);
    setActiveIndex((prev) => (prev < totalPhotos - 1 ? prev + 1 : 0));
  }, [totalPhotos]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant and exceeds 45px threshold
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
      if (diffX < 0) {
        // Swiped left -> next photo
        handleNext();
      } else {
        // Swiped right -> prev photo
        handlePrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Keyboard navigation: Escape to close, Left/Right arrows to navigate
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    // Lock scroll on background when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, handleClose, handlePrev, handleNext]);

  // Preload adjacent (prev & next) optimized photos only while lightbox is active
  useEffect(() => {
    if (!isOpen || activeIndex === null || totalPhotos <= 1) return;

    const nextIndex = (activeIndex + 1) % totalPhotos;
    const prevIndex = (activeIndex - 1 + totalPhotos) % totalPhotos;

    const nextSrc = gallery[nextIndex]?.src;
    const prevSrc = gallery[prevIndex]?.src;

    [nextSrc, prevSrc].forEach((url) => {
      if (url && !preloadedUrls.current.has(url)) {
        preloadedUrls.current.add(url);
        const img = new Image();
        img.decoding = "async";
        img.src = url;
      }
    });
  }, [isOpen, activeIndex, gallery, totalPhotos]);

  if (!gallery || gallery.length === 0) return null;

  return (
    <section
      id="gallery"
      className="gallery-section"
      aria-label="Pre-Wedding Photo Gallery"
    >
      {/* Section Header */}
      <div className="section-heading">
        <p className="section-subtitle font-serif">SWEET MEMORIES</p>
        <h2 className="section-title-khmer font-khmer-moul">
          កម្រងរូបភាពអនុស្សាវរីយ៍
        </h2>
        <p
          className="section-subtitle font-serif"
          style={{ letterSpacing: "2px" }}
        >
          PHOTO GALLERY &bull; PRE-WEDDING
        </p>
      </div>

      {/* Reusable Khmer Divider */}
      <div className="khmer-divider" aria-hidden="true">
        <span className="divider-ornament">✦ ❖ ✦</span>
      </div>

      {/* Gallery Grid with staggered scroll reveal */}
      <div
        className="gallery-grid"
        role="region"
        aria-label="Photo Gallery Grid"
      >
        {gallery.map((item, index) => {
          const thumbnailSrc = item.thumbnail || item.src;
          const hasRealPhoto = Boolean(
            thumbnailSrc && !thumbnailErrors[item.id],
          );
          const rowIndex = getGalleryRowIndex(index);
          const isRowVisible = Boolean(rowVisibility[rowIndex]);

          return (
            <motion.div
              key={item.id || index}
              ref={(el) => registerRowElement(rowIndex, el)}
              className="gallery-item-card"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={
                shouldReduceMotion
                  ? { opacity: 1, y: 0 }
                  : isRowVisible
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: 20 }
              }
              transition={
                isRowVisible
                  ? {
                      duration: 0.55,
                      delay: 0,
                      ease: [0.22, 1, 0.36, 1],
                    }
                  : { duration: 0 }
              }
              whileHover={shouldReduceMotion ? {} : { y: -4 }}
              onClick={() => {
                setSlideDirection(0);
                setActiveIndex(index);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSlideDirection(0);
                  setActiveIndex(index);
                }
              }}
              aria-label={`Open ${item.placeholderLabelEnglish || `Photo ${index + 1}`}`}
            >
              {/* Photo Frame */}
              <div className="gallery-card-inner">
                {hasRealPhoto ? (
                  <img
                    src={thumbnailSrc}
                    alt={item.alt || item.placeholderLabelEnglish}
                    className="gallery-card-img"
                    onError={() => handleThumbnailError(item.id)}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  /* Luxury Temporary Placeholder Card */
                  <div className="gallery-placeholder-inner" aria-hidden="true">
                    <span className="placeholder-top-icon">❖</span>
                    <span className="placeholder-number-badge font-serif">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="placeholder-khmer-label font-khmer">
                      {item.placeholderLabelKhmer}
                    </span>
                    <span className="placeholder-en-label font-serif">
                      {item.placeholderLabelEnglish}
                    </span>
                    <span className="placeholder-status-tag font-khmer">
                      Coming Soon &bull; ឆាប់ៗនេះ
                    </span>
                  </div>
                )}

                {/* Subtle Hover Zoom Overlay */}
                <div className="gallery-card-hover-overlay" aria-hidden="true">
                  <ZoomIn size={22} className="hover-zoom-icon" />
                  <span className="hover-view-label font-serif">VIEW</span>
                </div>

                {/* Decorative Khmer Traditional Corners */}
                <div
                  className="photo-corner-accent top-left"
                  aria-hidden="true"
                />
                <div
                  className="photo-corner-accent top-right"
                  aria-hidden="true"
                />
                <div
                  className="photo-corner-accent bottom-left"
                  aria-hidden="true"
                />
                <div
                  className="photo-corner-accent bottom-right"
                  aria-hidden="true"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Hint for guests */}
      <p className="gallery-tap-hint font-khmer">
        ចុចលើរូបភាពនីមួយៗ ដើម្បីមើលក្នុងទម្រង់ធំ (គាំទ្រការអូស Touch Swipe)
      </p>

      {/* Lightbox / Modal */}
      <AnimatePresence>
        {isOpen && currentPhoto && (
          <motion.div
            className="gallery-lightbox-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.15 : 0.25 }}
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-label="Photo Lightbox"
          >
            {/* Lightbox Main Container with Touch Gestures */}
            <motion.div
              className="gallery-lightbox-content"
              initial={{ scale: shouldReduceMotion ? 1 : 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.25 }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Top Controls Bar */}
              <div className="lightbox-top-bar">
                <span className="lightbox-counter font-serif">
                  {activeIndex + 1} / {totalPhotos}
                </span>

                <button
                  type="button"
                  className="lightbox-close-btn"
                  onClick={handleClose}
                  aria-label="Close photo preview (Escape)"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Photo / Large Placeholder View with Slide Animation */}
              <div className="lightbox-media-wrapper">
                <AnimatePresence mode="wait" custom={slideDirection}>
                  <motion.div
                    key={activeIndex}
                    custom={slideDirection}
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            x:
                              slideDirection > 0
                                ? 60
                                : slideDirection < 0
                                  ? -60
                                  : 0,
                          }
                    }
                    animate={{ opacity: 1, x: 0 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            x:
                              slideDirection > 0
                                ? -60
                                : slideDirection < 0
                                  ? 60
                                  : 0,
                          }
                    }
                    transition={{ duration: 0.28, ease: "easeOut" }}
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {currentPhoto &&
                    !lightboxErrors[currentPhoto.id] &&
                    getLightboxSrc(currentPhoto) ? (
                      <img
                        src={getLightboxSrc(currentPhoto)}
                        alt={
                          currentPhoto.alt ||
                          currentPhoto.placeholderLabelEnglish
                        }
                        className="lightbox-full-img"
                        decoding="async"
                        onError={() => handleLightboxError(currentPhoto)}
                      />
                    ) : (
                      <div
                        className="lightbox-placeholder-card"
                        aria-hidden="true"
                      >
                        <span className="lightbox-placeholder-ornament font-serif">
                          ❖
                        </span>
                        <span className="lightbox-placeholder-num font-serif">
                          {String(activeIndex + 1).padStart(2, "0")}
                        </span>
                        <h3 className="lightbox-placeholder-title-kh font-khmer">
                          {currentPhoto.placeholderLabelKhmer}
                        </h3>
                        <p className="lightbox-placeholder-title-en font-serif">
                          {currentPhoto.placeholderLabelEnglish}
                        </p>
                        <div
                          className="khmer-divider"
                          style={{ margin: "10px auto" }}
                        >
                          <span className="divider-ornament">✦ ❖ ✦</span>
                        </div>
                        <p className="lightbox-placeholder-note font-khmer">
                          រូបថត Pre-Wedding នឹងត្រូវបានដាក់បង្ហាញឆាប់ៗនេះ
                        </p>
                        <p className="lightbox-placeholder-sub font-serif">
                          Pre-Wedding photographs coming soon
                        </p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Bottom Caption & Navigation */}
              <div className="lightbox-bottom-bar">
                {currentPhoto.captionKhmer && (
                  <p className="lightbox-caption-kh font-khmer">
                    {currentPhoto.captionKhmer}
                  </p>
                )}
                {currentPhoto.captionEnglish && (
                  <p className="lightbox-caption-en font-serif">
                    {currentPhoto.captionEnglish}
                  </p>
                )}

                <div className="lightbox-nav-buttons">
                  <button
                    type="button"
                    className="lightbox-nav-btn"
                    onClick={handlePrev}
                    aria-label="Previous photograph"
                  >
                    <ChevronLeft size={20} />
                    <span className="font-serif">PREV</span>
                  </button>

                  <span className="lightbox-indicator-dot font-serif">
                    {/* Touch gesture hint on mobile */}
                    <span className="lightbox-swipe-hint font-khmer">
                      អូសដើម្បីប្តូររូបភាព
                    </span>
                  </span>

                  <button
                    type="button"
                    className="lightbox-nav-btn"
                    onClick={handleNext}
                    aria-label="Next photograph"
                  >
                    <span className="font-serif">NEXT</span>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
