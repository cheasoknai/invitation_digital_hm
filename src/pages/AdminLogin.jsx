import { useState } from "react";
import { Lock, Mail, ArrowLeft, Loader2, ShieldCheck, Info, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase.js";

/**
 * AdminLogin Component
 * Authenticates wedding administrators securely through Supabase Auth.
 * Emits a valid JWT session to allow RLS-protected queries on public.guests.
 *
 * @param {object} props
 * @param {function} [props.onLoginSuccess] - Callback after successful authentication
 */
export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const completeLogin = (sessionData) => {
    localStorage.setItem("hm_admin_session", JSON.stringify(sessionData));
    if (onLoginSuccess) {
      onLoginSuccess(sessionData);
    } else {
      window.location.href = "/admin";
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const cleanEmail = email.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg(
            "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ (Invalid email or password). សូមពិនិត្យគណនី Admin ក្នុង Supabase Auth។"
          );
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMsg(
            "អ៊ីមែលមិនទាន់ត្រូវបានបញ្ជាក់ (Email not confirmed). Please confirm your user in Supabase Auth or disable email confirmation in Auth settings."
          );
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        completeLogin(data.session);
      } else {
        setErrorMsg("No active session returned. Please verify credentials.");
      }
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="admin-page-container">
      <div className="admin-login-card">
        {/* Header Branding */}
        <div className="admin-login-header">
          <div className="admin-badge-circle" aria-hidden="true">
            <ShieldCheck size={28} className="admin-badge-icon" />
          </div>
          <p className="admin-eyebrow font-serif">INVITATION DIGITAL H&amp;M</p>
          <h1 className="admin-title font-khmer-moul">
            ប្រព័ន្ធគ្រប់គ្រងភ្ញៀវ
          </h1>
          <p className="admin-subtitle font-serif">ADMINISTRATOR PORTAL</p>
        </div>

        <div
          className="khmer-divider"
          aria-hidden="true"
          style={{ margin: "1rem 0" }}
        >
          <span className="divider-ornament">✦ ❖ ✦</span>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="admin-error-box font-khmer" role="alert">
            <p>{errorMsg}</p>
          </div>
        )}

        {/* Standard Login Form */}
        <form onSubmit={handleLogin} className="admin-form">
          {/* Email Field */}
          <div className="admin-input-group">
            <label htmlFor="admin-email" className="admin-label font-khmer">
              អ៊ីមែល / Email Address:
            </label>
            <div className="admin-input-wrap">
              <Mail size={18} className="admin-input-icon" aria-hidden="true" />
              <input
                id="admin-email"
                type="email"
                className="admin-input font-serif"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@invitation.com"
                required
                autoComplete="username email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="admin-input-group">
            <label htmlFor="admin-password" className="admin-label font-khmer">
              ពាក្យសម្ងាត់ / Password:
            </label>
            <div className="admin-input-wrap">
              <Lock size={18} className="admin-input-icon" aria-hidden="true" />
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                className="admin-input font-serif"
                style={{ paddingRight: "46px" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="admin-password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="admin-btn-primary font-serif"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinner-icon" />
                <span>SIGNING IN...</span>
              </>
            ) : (
              <span>ចូលប្រើប្រាស់ &bull; SIGN IN</span>
            )}
          </button>
        </form>

        {/* Auth Notice */}
        <div
          style={{
            marginTop: "1.25rem",
            padding: "0.75rem 1rem",
            background: "rgba(181, 155, 109, 0.08)",
            border: "1px dashed rgba(181, 155, 109, 0.35)",
            borderRadius: "8px",
            fontSize: "0.78rem",
            color: "#6b7280",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            lineHeight: 1.4,
          }}
        >
          <Info size={16} style={{ color: "var(--color-gold)", flexShrink: 0, marginTop: "2px" }} />
          <span>
            Protected with Supabase Auth &amp; Row Level Security. Only authorized wedding administrators can manage guests.
          </span>
        </div>

        {/* Footer Navigation */}
        <div className="admin-login-footer">
          <button
            type="button"
            className="admin-link-btn font-khmer"
            onClick={handleGoHome}
          >
            <ArrowLeft size={16} />
            <span>ត្រឡប់ទៅកាន់លិខិតអញ្ជើញ (Back to Wedding)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
