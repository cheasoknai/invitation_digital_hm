import { useState, useRef, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import OpeningScreen from "./components/OpeningScreen.jsx";
import MusicControl from "./components/MusicControl.jsx";
import CoupleSection from "./components/CoupleSection.jsx";
import WeddingDetails from "./components/WeddingDetails.jsx";
import VenueSection from "./components/VenueSection.jsx";
import RsvpSection from "./components/RsvpSection.jsx";
import PhotoGallery from "./components/PhotoGallery.jsx";
import GiftQRCode from "./components/GiftQRCode.jsx";
import InvitationMessage from "./components/InvitationMessage.jsx";
import ClosingSection from "./components/ClosingSection.jsx";
import invitationData from "./data/invitation.js";
import MyCredit from "./components/MyCredit.jsx";
import FloatingPetals from "./components/FloatingPetals.jsx";
import Navigation from "./components/Navigation.jsx";
import ScrollReveal from "./components/common/ScrollReveal.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import GuestInvitation from "./pages/GuestInvitation.jsx";

export default function App({ guest, onRsvpUpdated }) {
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [isInvitationOpen, setIsInvitationOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Reset scroll to top on every browser refresh and ensure clean URL bar
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    // Automatically remove any query parameters (like ?to=...) from the browser address bar
    if (window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // 1. Admin Route: /admin or /admin/*
  if (!guest && (currentPath === "/admin" || currentPath.startsWith("/admin/"))) {
    return <AdminDashboard />;
  }

  // 2. Guest Invitation Route: /invite/:slug (supports both guest slug and legacy token)
  if (!guest && currentPath.startsWith("/invite/")) {
    const rawSlug = currentPath.replace(/^\/invite\/?/, "").split("/")[0].split("?")[0];
    const slug = decodeURIComponent(rawSlug);
    return <GuestInvitation slug={slug} />;
  }

  const { couple } = invitationData;

  // Staged opening flow: immediate audio trigger followed by visual reveal
  const handleOpenInvitation = (opts) => {
    if (opts?.immediateAudioOnly) {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.info("Simulated music play active:", err.message);
            setIsPlaying(true);
          });
      } else {
        setIsPlaying(true);
      }
      return;
    }

    setIsInvitationOpen(true);

    if (audioRef.current && !isPlaying) {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.info("Audio playback started:", err.message);
          setIsPlaying(true);
        });
    } else {
      setIsPlaying(true);
    }
  };

  // Toggle play/pause via floating music button
  const toggleMusic = () => {
    if (isPlaying) {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {
          // ignore
        }
      }
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.info("Simulated music play active:", err.message);
            setIsPlaying(true);
          });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleResetInvitation = () => {
    setIsInvitationOpen(false);
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // ignore
      }
    }
    setIsPlaying(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Floating Ambient Golden Petals */}
      <FloatingPetals count={16} />

      {/* Floating Music Control (Play/Pause after user interaction) */}
      <MusicControl
        isPlaying={isPlaying}
        onToggle={toggleMusic}
        audioRef={audioRef}
      />

      {/* Floating Quick Navigation Dock */}
      <Navigation isVisible={isInvitationOpen} />

      {/* Opening Screen and 3D Envelope Cover */}
      <OpeningScreen
        isOpen={isInvitationOpen}
        onOpen={handleOpenInvitation}
        guest={guest}
      />

      {/* Main Invitation (Revealed after opening) */}
      {isInvitationOpen && (
        <motion.div
          className="invitation-wrapper"
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <main className="invitation-frame">
            {/* Header Section with Forward-Only Repeatable Entrance Animation */}
            <ScrollReveal
              as={motion.header}
              className="section-heading"
              initial={shouldReduceMotion ? {} : { opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 1.4,
                delay: 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
              threshold={0.15}
            >
              <p className="section-subtitle font-serif">
                THE WEDDING CELEBRATION
              </p>
              <h1 className="section-title-khmer">សិរីសួស្តី អាពាហ៍ពិពាហ៍</h1>

              {/* Parents Names Block (Groom's Parents Left, Bride's Parents Right) */}
              <div className="header-parents-grid font-khmer">
                {/* Groom's Parents (Left Column) */}
                <div className="header-parents-col">
                  <div className="parent-row">
                    <span className="parent-title">លោក</span>
                    <span className="parent-name">
                      {couple.groom.fatherKhmer}
                    </span>
                  </div>
                  <div className="parent-row">
                    <span className="parent-title">លោកស្រី</span>
                    <span className="parent-name">
                      {couple.groom.motherKhmer}
                    </span>
                  </div>
                </div>

                {/* Bride's Parents (Right Column) */}
                <div className="header-parents-col">
                  <div className="parent-row">
                    <span className="parent-title">លោក</span>
                    <span className="parent-name">
                      {couple.bride.fatherKhmer}
                    </span>
                  </div>
                  <div className="parent-row">
                    <span className="parent-title">លោកស្រី</span>
                    <span className="parent-name">
                      {couple.bride.motherKhmer}
                    </span>
                  </div>
                </div>
              </div>

              <h2
                className="section-title font-serif"
                style={{ marginTop: "0.75rem" }}
              >
                {couple.groom.initial} &amp; {couple.bride.initial}
              </h2>

              {/* Personalized Guest Welcome Badge */}
              {guest?.guest_name && (
                <div className="personalized-guest-welcome font-khmer">
                  <span className="welcome-pre font-serif">CORDIALLY INVITED</span>
                  <p className="welcome-honorific">
                    សូមគោរពអញ្ជើញ ឯកឧត្តម លោកជំទាវ លោក លោកស្រី អ្នកនាងកញ្ញា
                  </p>
                  <h3 className="welcome-guest-name font-khmer-moul">
                    {guest.guest_name}
                  </h3>
                </div>
              )}
            </ScrollReveal>

            {/* Reusable Khmer Ornamental Divider */}
            <div className="khmer-divider" aria-hidden="true">
              <span className="divider-ornament">✦ ❖ ✦</span>
            </div>

            {/* Couple Section */}
            <CoupleSection />

            {/* Official Invitation Message & Blessing */}
            <InvitationMessage />

            {/* Wedding Date, Live Countdown, and Ceremony Schedule */}
            <WeddingDetails />

            {/* Venue and Google Maps Location */}
            <VenueSection />

            {/* RSVP Attendance Confirmation */}
            <RsvpSection guest={guest} onRsvpUpdated={onRsvpUpdated} />

            {/* Photo Gallery: Pre-Wedding Photographs */}
            <PhotoGallery />

            {/* Wedding Gift QR Code */}
            <GiftQRCode />

            {/* Closing Gratitude & Family Signatures */}
            <ClosingSection />

            {/* Creator Credit */}
            <MyCredit />

            {/* View Envelope Animation Again Button */}
            <button
              type="button"
              className="btn btn-secondary retest-envelope-btn"
              onClick={handleResetInvitation}
              style={{
                width: "100%",
                marginTop: "1rem",
                padding: "0.85rem 1.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.88rem",
                letterSpacing: "0.5px",
                borderRadius: "var(--border-radius-sm)"
              }}
              aria-label="Re-close envelope to view opening animation again"
            >
              <span className="font-khmer">ទស្សនាការបើកលិខិតម្តងទៀត</span>
              <span style={{ opacity: 0.6 }}>&bull;</span>
              <span className="font-serif">VIEW ENVELOPE AGAIN</span>
            </button>

            {/* Footer Status */}
            <footer style={{ marginTop: "1.25rem" }}>
              <p
                className="font-serif"
                style={{
                  fontSize: "0.75rem",
                  letterSpacing: "1px",
                  color: "var(--color-text)",
                  opacity: 0.8,
                }}
              >
                PREMIUM ANIMATION SYSTEM &bull; INVITATION DIGITAL H&amp;M
              </p>
            </footer>
          </main>
        </motion.div>
      )}
    </>
  );
}
