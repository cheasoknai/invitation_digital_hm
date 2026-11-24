import { useState, useEffect } from "react";
import { Loader2, HeartCrack, ArrowLeft } from "lucide-react";
import { fetchGuestBySlug } from "../lib/guestService.js";
import App from "../App.jsx";

/**
 * GuestInvitation Page
 * Loaded when a guest visits their personalized URL:
 *   /invite/:slug
 *
 * Securely retrieves ONLY this guest's data via slug (or legacy token) and renders
 * the full wedding invitation with their name personalized throughout.
 *
 * @param {object} props
 * @param {string} [props.slug] - Guest URL slug (e.g. 'cheasoknai')
 * @param {string} [props.token] - Legacy invitation token
 */
export default function GuestInvitation({ slug, token }) {
  const identifier = slug || token;
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadGuest() {
      if (!identifier) {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(false);

      const { data, error: fetchErr } = await fetchGuestBySlug(identifier);

      if (!isMounted) return;

      if (fetchErr || !data) {
        console.warn("Guest lookup:", fetchErr?.message || "Not found");
        setError(true);
      } else {
        setGuest(data);
      }
      setLoading(false);
    }

    loadGuest();

    return () => {
      isMounted = false;
    };
  }, [identifier]);

  // Handle live RSVP update from RsvpSection
  const handleRsvpUpdated = (updatedRecord) => {
    if (updatedRecord) {
      setGuest((prev) => ({
        ...prev,
        ...updatedRecord,
      }));
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="guest-loading-screen font-serif">
        <Loader2 size={36} className="spinner-icon" />
        <p className="loading-title">PREPARING WEDDING INVITATION...</p>
        <p className="loading-khmer font-khmer">កំពុងរៀបចំលិខិតអញ្ជើញ...</p>
      </div>
    );
  }

  // 2. Token Not Found / Error State
  if (error || !guest) {
    return (
      <div className="guest-error-screen font-khmer">
        <div className="guest-error-card">
          <HeartCrack size={44} className="guest-error-icon" />
          <h2 className="guest-error-title font-khmer-moul">រកមិនឃើញលិខិតអញ្ជើញ</h2>
          <p className="guest-error-desc">
            សូមអភ័យទោស តំណភ្ជាប់លិខិតអញ្ជើញនេះមិនត្រឹមត្រូវ ឬត្រូវបានផ្លាស់ប្តូរ។
            លោកអ្នកនៅតែអាចទស្សនាលិខិតអញ្ជើញទូទៅនៃពិធីអាពាហ៍ពិពាហ៍របស់យើងខ្ញុំបាន។
          </p>
          <p className="guest-error-en font-serif">
            INVITATION LINK NOT FOUND OR EXPIRED
          </p>
          <a href="/" className="guest-error-btn font-serif">
            <ArrowLeft size={16} />
            <span>VIEW GENERAL INVITATION &bull; មើលលិខិតអញ្ជើញ</span>
          </a>
        </div>
      </div>
    );
  }

  // 3. Render Personalized Wedding Invitation
  return <App guest={guest} onRsvpUpdated={handleRsvpUpdated} />;
}
