import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CalendarPlus, Calendar, Download, ChevronDown, Check } from "lucide-react";
import invitationData from "../data/invitation.js";

/**
 * AddToCalendar Component
 * Provides one-tap integration for Google Calendar and Apple / Outlook (.ics download).
 * Styled in Khmer Traditional Luxury palette (#631A26, #B59B6D, #E6E2D8).
 */
export default function AddToCalendar() {
  const [isOpen, setIsOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const dropdownRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  const { date, venue, couple } = invitationData;

  // Close dropdown on click outside (active only when dropdown is open)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen]);

  // Event parameters
  const eventTitle = `អាពាហ៍ពិពាហ៍ ${couple.groom.nameKhmer} & ${couple.bride.nameKhmer} (${couple.groom.nameEnglish} & ${couple.bride.nameEnglish})`;
  const eventLocation = `${venue.nameKhmer}, ${venue.addressKhmer} (${venue.addressEnglish})`;
  const directionsLink = "https://www.google.com/maps/dir/?api=1&destination=13.6614444,102.56125&travelmode=driving";
  const eventDetails = `ពិធីសិរីសួស្តីអាពាហ៍ពិពាហ៍ រវាង ${couple.groom.nameKhmer} និង ${couple.bride.nameKhmer} នៅថ្ងៃទី ${date.displayDateKhmer}។\n\nទីតាំងផែនទី / Directions:\n${directionsLink}`;

  // Time parameters in UTC (December 18, 2026: 05:40 AM to 22:00 PM ICT / UTC+7)
  const startTimeUtc = "20261217T224000Z";
  const endTimeUtc = "20261218T150000Z";

  // Google Calendar URL
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    eventTitle
  )}&dates=${startTimeUtc}/${endTimeUtc}&details=${encodeURIComponent(
    eventDetails
  )}&location=${encodeURIComponent(eventLocation)}`;

  // Download iCal (.ics) file for Apple Calendar, Outlook, and mobile devices
  const handleDownloadIcs = () => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TongHour & SivMinh Wedding//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:wedding-tonghour-sivminh-${Date.now()}@invitation-hm`,
      "DTSTAMP:20261121T000000Z",
      `DTSTART:${startTimeUtc}`,
      `DTEND:${endTimeUtc}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventDetails.replace(/\n/g, "\\n")}`,
      `LOCATION:${eventLocation}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Wedding-TongHour-SivMinh.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="calendar-action-wrapper" ref={dropdownRef}>
      {/* Primary Add to Calendar CTA */}
      <motion.button
        type="button"
        className="luxury-calendar-btn font-serif"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="បញ្ចូលកាលបរិច្ឆេទក្នុងប្រតិទិន Add wedding date to calendar"
        whileHover={shouldReduceMotion ? {} : { y: -2, scale: 1.02 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="calendar-btn-icon-circle" aria-hidden="true">
          <CalendarPlus size={18} className="calendar-btn-icon" />
        </span>

        <span className="calendar-btn-text-wrap">
          <span className="calendar-btn-khmer font-khmer">
            បញ្ចូលក្នុងប្រតិទិន
          </span>
          <span className="calendar-btn-english font-serif">
            ADD TO CALENDAR
          </span>
        </span>

        <span
          className={`calendar-btn-chevron-circle ${isOpen ? "is-open" : ""}`}
          aria-hidden="true"
        >
          <ChevronDown size={14} className="calendar-chevron-icon" />
        </span>
      </motion.button>

      {/* Dropdown Options Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="calendar-dropdown-menu"
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -8, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { opacity: 0, y: -6, scale: 0.96 }
            }
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="calendar-menu-item"
              onClick={() => setIsOpen(false)}
            >
              <span className="calendar-item-icon-box" aria-hidden="true">
                <Calendar size={16} />
              </span>
              <span className="calendar-item-text">
                <span className="calendar-item-title font-khmer">Google Calendar</span>
                <span className="calendar-item-sub font-serif">Open in Google Calendar</span>
              </span>
            </a>

            <button
              type="button"
              className="calendar-menu-item"
              onClick={handleDownloadIcs}
            >
              <span className="calendar-item-icon-box" aria-hidden="true">
                {downloaded ? <Check size={16} color="#4ade80" /> : <Download size={16} />}
              </span>
              <span className="calendar-item-text">
                <span className="calendar-item-title font-khmer">
                  {downloaded ? "បានទាញយក (.ics)!" : "Apple / Outlook / iCal"}
                </span>
                <span className="calendar-item-sub font-serif">
                  {downloaded ? "File downloaded successfully" : "Download .ics Calendar File"}
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
