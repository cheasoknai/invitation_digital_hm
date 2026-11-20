import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import invitationData from "../data/invitation.js";

/**
 * AnimatedDigit Component
 * Smooth rolling number animation whenever the digit updates.
 */
function AnimatedDigit({ value, shouldReduceMotion }) {
  if (shouldReduceMotion) {
    return <span className="countdown-number font-serif">{value}</span>;
  }

  return (
    <div className="countdown-digit-slot">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="countdown-number font-serif"
          initial={{ y: 14, opacity: 0, filter: "blur(2px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -14, opacity: 0, filter: "blur(2px)" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/**
 * Countdown Component
 * Real-time countdown to the wedding ceremony date.
 * Features smooth digit roll transitions, timezone accuracy, responsive grid,
 * and respectful prefers-reduced-motion fallback.
 */
export default function Countdown() {
  const { date } = invitationData;
  const shouldReduceMotion = useReducedMotion();
  const targetTime = new Date(date.targetDateISO).getTime();

  const calculateTimeLeft = useCallback(() => {
    const now = new Date().getTime();
    const difference = targetTime - now;

    if (difference <= 0) {
      return {
        isPast: true,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    return {
      isPast: false,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }, [targetTime]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const padZero = (num) => String(num).padStart(2, "0");

  return (
    <div className="countdown-container" aria-label="Wedding Countdown">
      <div className="countdown-header">
        <p className="countdown-eyebrow font-serif">COUNTDOWN TO THE BIG DAY</p>
        <p className="countdown-khmer-sub font-khmer">
          រាប់ថយក្រោយឆ្ពោះទៅកាន់ថ្ងៃមង្គល
        </p>
      </div>

      {timeLeft.isPast ? (
        <div className="countdown-concluded-box">
          <span className="concluded-ornament font-serif">❖</span>
          <p className="concluded-text-kh font-khmer">
            ពិធីមង្គលការបានប្រារព្ធឡើងដោយជោគជ័យ និងពោរពេញដោយសុភមង្គល!
          </p>
          <p className="concluded-text-en font-serif">
            The wedding celebration has joyfully concluded. Thank you for your
            warm blessings!
          </p>
        </div>
      ) : (
        <div className="countdown-grid">
          {/* Days */}
          <div className="countdown-unit-box">
            <AnimatedDigit
              value={padZero(timeLeft.days)}
              shouldReduceMotion={shouldReduceMotion}
            />
            <span className="countdown-unit-kh font-khmer">ថ្ងៃ</span>
            <span className="countdown-unit-en font-serif">DAYS</span>
          </div>

          {/* Hours */}
          <div className="countdown-unit-box">
            <AnimatedDigit
              value={padZero(timeLeft.hours)}
              shouldReduceMotion={shouldReduceMotion}
            />
            <span className="countdown-unit-kh font-khmer">ម៉ោង</span>
            <span className="countdown-unit-en font-serif">HOURS</span>
          </div>

          {/* Minutes */}
          <div className="countdown-unit-box">
            <AnimatedDigit
              value={padZero(timeLeft.minutes)}
              shouldReduceMotion={shouldReduceMotion}
            />
            <span className="countdown-unit-kh font-khmer">នាទី</span>
            <span className="countdown-unit-en font-serif">MINS</span>
          </div>

          {/* Seconds */}
          <div className="countdown-unit-box highlight-unit">
            <AnimatedDigit
              value={padZero(timeLeft.seconds)}
              shouldReduceMotion={shouldReduceMotion}
            />
            <span className="countdown-unit-kh font-khmer">វិនាទី</span>
            <span className="countdown-unit-en font-serif">SECS</span>
          </div>
        </div>
      )}
    </div>
  );
}
