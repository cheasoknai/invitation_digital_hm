import { Music, Volume2 } from "lucide-react";
import invitationData from "../data/invitation.js";

/**
 * MusicControl Component
 * Floating audio control that plays Khmer wedding background music.
 * Music starts only after explicit user interaction (click).
 * Can be toggled on/off repeatedly at any time.
 *
 * @param {boolean} isPlaying - Current audio playback state
 * @param {function} onToggle - Function to toggle play/pause
 * @param {React.RefObject} audioRef - Ref to the HTML5 audio element
 */
export default function MusicControl({ isPlaying, onToggle, audioRef }) {
  const { media } = invitationData;

  const handleAudioError = () => {
    console.info(
      `[MusicControl] Audio source "${media.musicSrc}" is a placeholder or not yet provided. Place your MP3 file into public/assets/audio/ to hear audio.`
    );
  };

  return (
    <div className="music-control-wrapper">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={media.musicSrc}
        loop
        preload="none"
        onError={handleAudioError}
      />

      {/* Floating Music Toggle Button - Always responsive to user clicks */}
      <button
        type="button"
        className={`music-btn ${isPlaying ? "is-playing" : ""}`}
        onClick={onToggle}
        aria-label={isPlaying ? "Pause background music" : "Play background music"}
        title={
          isPlaying
            ? `Playing: ${media.musicTitle || "Wedding Song"}`
            : "Click to play background music"
        }
      >
        <span className="music-icon-wrap" aria-hidden="true">
          {isPlaying ? <Volume2 size={18} /> : <Music size={18} />}
        </span>
        <span className="music-status-dot" aria-hidden="true" />
      </button>
    </div>
  );
}
