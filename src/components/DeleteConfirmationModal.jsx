import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Loader2 } from "lucide-react";

/**
 * DeleteConfirmationModal Component
 * Premium luxury delete confirmation dialog matching the Admin Dashboard design system.
 * Reusable across the entire application for visual and behavioral consistency.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is displayed
 * @param {string} [props.title] - English modal title
 * @param {string} [props.titleKhmer] - Khmer subtitle
 * @param {string} [props.itemName] - Name of the item being deleted (e.g. guest name)
 * @param {string} [props.itemDetails] - Secondary details (e.g. invitation slug)
 * @param {string} [props.message] - Descriptive warning text
 * @param {function} props.onConfirm - Callback to execute the deletion
 * @param {function} props.onCancel - Callback to cancel and close the modal
 * @param {boolean} [props.isDeleting] - Loading state while delete request is in flight
 * @param {string} [props.confirmText] - Label for delete button
 * @param {string} [props.cancelText] - Label for cancel button
 */
export default function DeleteConfirmationModal({
  isOpen,
  title = "Are you sure you want to delete?",
  titleKhmer = "តើអ្នកពិតជាចង់លុបទិន្នន័យនេះមែនទេ?",
  itemName,
  itemDetails,
  message = "",
  onConfirm,
  onCancel,
  isDeleting = false,
  confirmText = "លុប",
  cancelText = "បោះបង់",
}) {
  // Close on Escape key press (unless a delete operation is in flight)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isDeleting) {
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              onCancel?.();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <motion.div
            className="admin-delete-modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Warning Icon Badge */}
            <div className="admin-delete-icon-wrap" aria-hidden="true">
              <AlertTriangle size={28} />
            </div>

            {/* Bilingual Titles */}
            <h3
              id="delete-dialog-title"
              className="admin-delete-title font-serif"
            >
              {title}
            </h3>
            {titleKhmer && (
              <p className="admin-delete-subtitle-khmer font-khmer">
                {titleKhmer}
              </p>
            )}

            {/* Item Details Card */}
            {(itemName || itemDetails) && (
              <div className="admin-delete-guest-card">
                {itemName && (
                  <div className="admin-delete-guest-name font-khmer">
                    {itemName}
                  </div>
                )}
                {itemDetails && (
                  <div className="admin-delete-guest-slug">{itemDetails}</div>
                )}
              </div>
            )}

            {/* Descriptive Warning */}
            {message && (
              <p className="admin-delete-warning-text font-sans">{message}</p>
            )}

            {/* Action Buttons */}
            <div className="admin-delete-actions">
              <button
                type="button"
                className="admin-modal-cancel-btn font-serif"
                onClick={onCancel}
                disabled={isDeleting}
              >
                {cancelText}
              </button>
              <button
                type="button"
                className="admin-modal-delete-btn font-serif"
                onClick={onConfirm}
                disabled={isDeleting}
                autoFocus
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="spinner-icon" />
                    <span>DELETING...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
