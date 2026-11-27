import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Copy,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Link2,
  MessageSquare,
  Check,
  Loader2,
} from "lucide-react";
import { normalizeSlug } from "../lib/guestService.js";

/**
 * GuestDetailDrawer Component
 *
 * Dedicated slide-over detail view for wedding guests.
 * Desktop: Luxury slide-over panel from the right.
 * Mobile: Responsive bottom-sheet / drawer with touch handle.
 *
 * Displays all guest metadata, RSVP response message, link copy action,
 * inline editing for name & slug, and protected delete confirmation.
 */
export default function GuestDetailDrawer({
  isOpen,
  guest,
  onClose,
  onCopyLink,
  isCopied,
  onDelete,
  onSaveEdit,
  isSavingEdit = false,
  editError = "",
  clearEditError,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(guest?.guest_name || "");
  const [editSlug, setEditSlug] = useState(guest?.invitation_slug || "");
  const [prevGuestId, setPrevGuestId] = useState(guest?.id);

  // Sync edit form state whenever the selected guest changes
  if (guest?.id !== prevGuestId) {
    setPrevGuestId(guest?.id);
    setEditName(guest?.guest_name || "");
    setEditSlug(guest?.invitation_slug || "");
    setIsEditing(false);
  }

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isEditing) {
          setIsEditing(false);
          clearEditError?.();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isEditing, onClose, clearEditError]);

  if (!guest) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const slug = guest.invitation_slug || "";
  const inviteUrl = slug ? `${origin}/invite/${encodeURIComponent(slug)}` : "";
  const firstLetter = (guest.guest_name || "G").trim().charAt(0).toUpperCase();

  const handleStartEditing = () => {
    setEditName(guest.guest_name || "");
    setEditSlug(guest.invitation_slug || "");
    setIsEditing(true);
    clearEditError?.();
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditName(guest.guest_name || "");
    setEditSlug(guest.invitation_slug || "");
    clearEditError?.();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    const success = await onSaveEdit(guest.id, editName.trim(), editSlug.trim());
    if (success) {
      setIsEditing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="admin-drawer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSavingEdit) {
              onClose();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${guest.guest_name}`}
        >
          <motion.aside
            className="admin-drawer-panel"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Mobile Drag Indicator */}
            <div className="drawer-mobile-handle" aria-hidden="true" />

            {/* Drawer Top Navigation Header */}
            <div className="drawer-header">
              <div className="drawer-header-title-wrap">
                <span className="drawer-eyebrow font-serif">GUEST PROFILE</span>
                <h2 className="drawer-title font-khmer">ព័ត៌មានលម្អិតអំពីភ្ញៀវ</h2>
              </div>

              <button
                type="button"
                className="drawer-close-btn"
                onClick={onClose}
                aria-label="Close guest details"
                title="Close (Escape)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="drawer-body">
              {/* Profile Card Banner */}
              <div className="drawer-profile-card">
                <div className="drawer-avatar-circle font-khmer">
                  {firstLetter}
                </div>

                <div className="drawer-profile-info">
                  <h3 className="drawer-profile-name font-khmer">
                    {guest.guest_name}
                  </h3>

                  <div className="drawer-profile-badges">
                    <span
                      className={`status-pill status-${guest.rsvp_status} font-serif`}
                    >
                      {guest.rsvp_status === "accepted" && (
                        <CheckCircle2 size={13} />
                      )}
                      {guest.rsvp_status === "declined" && <XCircle size={13} />}
                      {guest.rsvp_status === "pending" && <Clock size={13} />}
                      <span>{guest.rsvp_status.toUpperCase()}</span>
                    </span>

                    {guest.created_at && (
                      <span className="drawer-date-badge font-serif">
                        <Calendar size={12} />
                        {new Date(guest.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Error Alert */}
              {editError && (
                <div className="drawer-error-box font-khmer" role="alert">
                  {editError}
                </div>
              )}

              {/* Edit Mode Form vs Read Mode Display */}
              {isEditing ? (
                <form onSubmit={handleSave} className="drawer-edit-form">
                  <div className="drawer-section-heading">
                    <span className="section-heading-khmer font-khmer">
                      កែសម្រួលព័ត៌មានភ្ញៀវ
                    </span>
                    <span className="section-heading-en font-serif">
                      EDIT GUEST INFORMATION
                    </span>
                  </div>

                  <div className="drawer-form-group">
                    <label className="drawer-form-label font-khmer">
                      ឈ្មោះភ្ញៀវកិត្តិយស (Guest Name) *
                    </label>
                    <input
                      type="text"
                      className="drawer-form-input font-khmer"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isSavingEdit}
                      maxLength={150}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="drawer-form-group">
                    <label className="drawer-form-label font-serif">
                      Custom URL Slug
                    </label>
                    <div className="drawer-slug-input-wrap">
                      <span className="drawer-slug-prefix font-sans">
                        /invite/
                      </span>
                      <input
                        type="text"
                        className="drawer-slug-input font-sans"
                        placeholder="custom-slug"
                        value={editSlug}
                        onChange={(e) =>
                          setEditSlug(normalizeSlug(e.target.value))
                        }
                        disabled={isSavingEdit}
                        maxLength={60}
                      />
                    </div>
                    <span className="drawer-form-hint font-sans">
                      Allowed characters: a-z, 0-9, hyphens. E.g.
                      /invite/mr-soknai
                    </span>
                  </div>

                  <div className="drawer-edit-buttons">
                    <button
                      type="submit"
                      className="drawer-btn-save font-serif"
                      disabled={isSavingEdit || !editName.trim()}
                    >
                      {isSavingEdit ? (
                        <>
                          <Loader2 size={16} className="spinner-icon" />
                          <span>SAVING...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>SAVE CHANGES</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="drawer-btn-cancel font-serif"
                      onClick={handleCancelEditing}
                      disabled={isSavingEdit}
                    >
                      CANCEL
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Personalized Invitation Link Card */}
                  <div className="drawer-detail-card">
                    <div className="drawer-card-header">
                      <div className="card-header-icon-wrap icon-link">
                        <Link2 size={18} />
                      </div>
                      <div>
                        <h4 className="drawer-card-title font-khmer">
                          តំណភ្ជាប់លិខិតអញ្ជើញ
                        </h4>
                        <span className="drawer-card-subtitle font-serif">
                          PERSONALIZED INVITATION LINK
                        </span>
                      </div>
                    </div>

                    <div className="drawer-link-box">
                      <code className="drawer-slug-display font-sans">
                        {inviteUrl || "/invite/(not configured)"}
                      </code>
                    </div>

                    <div className="drawer-link-actions">
                      <button
                        type="button"
                        className={`drawer-copy-btn font-serif ${isCopied ? "is-copied" : ""}`}
                        onClick={() => onCopyLink(guest)}
                        disabled={!slug}
                      >
                        {isCopied ? (
                          <>
                            <Check size={16} />
                            <span>COPIED TO CLIPBOARD!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>COPY INVITATION LINK</span>
                          </>
                        )}
                      </button>

                      {inviteUrl && (
                        <a
                          href={inviteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="drawer-open-btn font-serif"
                          title="Open guest invitation in a new tab"
                        >
                          <ExternalLink size={16} />
                          <span>OPEN</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* RSVP Response Status & Message Card */}
                  <div className="drawer-detail-card">
                    <div className="drawer-card-header">
                      <div className="card-header-icon-wrap icon-rsvp">
                        <MessageSquare size={18} />
                      </div>
                      <div>
                        <h4 className="drawer-card-title font-khmer">
                          ចម្លើយតប និងសារជូនពរ
                        </h4>
                        <span className="drawer-card-subtitle font-serif">
                          RSVP STATUS &amp; MESSAGE
                        </span>
                      </div>
                    </div>

                    <div className="drawer-rsvp-status-row">
                      <span className="drawer-field-label font-khmer">
                        ស្ថានភាព៖
                      </span>
                      <span
                        className={`status-pill status-${guest.rsvp_status} font-serif`}
                      >
                        {guest.rsvp_status === "accepted" && (
                          <CheckCircle2 size={13} />
                        )}
                        {guest.rsvp_status === "declined" && (
                          <XCircle size={13} />
                        )}
                        {guest.rsvp_status === "pending" && <Clock size={13} />}
                        <span>
                          {guest.rsvp_status === "accepted"
                            ? "បានឆ្លើយតបចូលរួម (ACCEPTED)"
                            : guest.rsvp_status === "declined"
                              ? "មិនបានចូលរួម (DECLINED)"
                              : "មិនទាន់ឆ្លើយតប (PENDING)"}
                        </span>
                      </span>
                    </div>

                    <div className="drawer-message-section">
                      <span className="drawer-field-label font-khmer">
                        សារជូនពររបស់ភ្ញៀវ៖
                      </span>
                      {guest.rsvp_message ? (
                        <blockquote className="drawer-message-quote font-khmer">
                          &ldquo;{guest.rsvp_message}&rdquo;
                        </blockquote>
                      ) : (
                        <p className="drawer-no-message font-khmer">
                          (ភ្ញៀវមិនទាន់បានសរសេរសារជូនពរនៅឡើយទេ)
                        </p>
                      )}
                    </div>

                    {guest.updated_at && (
                      <div className="drawer-timestamp-row font-serif">
                        <span>Last updated:</span>
                        <span>{new Date(guest.updated_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Guest Management Actions Toolbar */}
                  <div className="drawer-actions-card">
                    <div className="drawer-actions-grid">
                      <button
                        type="button"
                        className="drawer-action-btn edit-action font-serif"
                        onClick={handleStartEditing}
                      >
                        <Edit2 size={16} />
                        <span>EDIT DETAILS</span>
                      </button>

                      <button
                        type="button"
                        className="drawer-action-btn delete-action font-serif"
                        onClick={() => onDelete(guest)}
                      >
                        <Trash2 size={16} />
                        <span>DELETE GUEST</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="drawer-footer">
              <button
                type="button"
                className="drawer-close-action font-serif"
                onClick={onClose}
              >
                <span>CLOSE / ត្រឡប់ក្រោយ</span>
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
