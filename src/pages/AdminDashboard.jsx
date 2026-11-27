import { useState, useEffect, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  Search,
  Copy,
  LogOut,
  RefreshCw,
  Check,
  Globe,
  Loader2,
  Link2,
  ChevronRight,
  ChevronLeft,
  Calendar,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import {
  generateInvitationToken,
  generateGuestSlug,
  insertGuest,
  normalizeSlug,
  checkSlugIsUnique,
} from "../lib/guestService.js";
import AdminLogin from "./AdminLogin.jsx";
import DeleteConfirmationModal from "../components/DeleteConfirmationModal.jsx";
import GuestDetailDrawer from "../components/GuestDetailDrawer.jsx";

/**
 * AdminDashboard Component
 *
 * Secure Administrator Portal for Digital Wedding Invitation H&M.
 * Strictly uses Supabase Auth as the single source of truth.
 * Supports custom invitation slugs with automatic normalization & duplicate validation.
 * Full CRUD operations persist directly to Supabase public.guests PostgreSQL table
 * under Row Level Security (RLS) with the 'authenticated' role.
 *
 * Responsive Redesign:
 * - Replaces rigid table with interactive, touch-friendly guest cards.
 * - Dedicated slide-over detail drawer on desktop, responsive bottom-sheet on mobile.
 * - Seamless search, filtering, and responsive pagination.
 */
export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [guests, setGuests] = useState([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState("connecting"); // 'connected' | 'connecting' | 'error'

  // Add guest form state
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestSlug, setNewGuestSlug] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Selected guest ID for Dedicated Detail Drawer (null when closed)
  const [selectedGuestId, setSelectedGuestId] = useState(null);

  // Inline editing state for detail drawer / quick edits
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Copied link feedback: guestId string or null
  const [copiedId, setCopiedId] = useState(null);

  // Deleting in-flight state: guestId string or null
  const [deletingId, setDeletingId] = useState(null);
  // Selected guest for custom Delete Confirmation Dialog (null when closed)
  const [guestToDelete, setGuestToDelete] = useState(null);

  // Derive the active selected guest object from guests state
  const selectedGuest = guests.find((g) => g.id === selectedGuestId) || null;

  // Reset pagination to page 1 whenever search query or status filter changes
  const [prevFilters, setPrevFilters] = useState({ searchQuery, statusFilter });
  if (prevFilters.searchQuery !== searchQuery || prevFilters.statusFilter !== statusFilter) {
    setPrevFilters({ searchQuery, statusFilter });
    setCurrentPage(1);
  }

  // Close modals/drawers on Escape key press with proper hierarchy
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (guestToDelete && !deletingId) {
          setGuestToDelete(null);
        } else if (selectedGuestId) {
          setSelectedGuestId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guestToDelete, deletingId, selectedGuestId]);

  // 1. Manage Auth Session (Supabase Auth as single source of truth)
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const {
          data: { session: supaSession },
        } = await supabase.auth.getSession();

        if (isMounted) {
          if (supaSession?.user && supaSession?.access_token) {
            setSession(supaSession);
            localStorage.setItem(
              "hm_admin_session",
              JSON.stringify(supaSession),
            );
          } else {
            setSession(null);
            localStorage.removeItem("hm_admin_session");
          }
          setAuthLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Auth check exception:", err);
          setSession(null);
          localStorage.removeItem("hm_admin_session");
          setAuthLoading(false);
        }
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, supaSession) => {
      if (!isMounted) return;

      if (supaSession?.user && supaSession?.access_token) {
        setSession(supaSession);
        localStorage.setItem("hm_admin_session", JSON.stringify(supaSession));
      } else {
        setSession(null);
        localStorage.removeItem("hm_admin_session");
        setGuests([]);
      }
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch guests: queries Supabase public.guests directly using verified JWT
  const fetchGuests = useCallback(async () => {
    setLoadingGuests(true);
    setErrorMsg("");

    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (!currentSession?.access_token) {
        setErrorMsg("Your session has expired. Please sign in again.");
        setGuests([]);
        setLoadingGuests(false);
        return;
      }

      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch error:", error);
        setErrorMsg(error.message || "Failed to load guests from database.");
        setGuests([]);
      } else if (data) {
        setGuests(data);
      }
    } catch (err) {
      console.error("Supabase query exception:", err);
      setErrorMsg(err.message || "Unexpected error querying database.");
      setGuests([]);
    } finally {
      setLoadingGuests(false);
    }
  }, []);

  // 3. Initial load guests when authenticated session is ready & listen to Supabase Realtime
  useEffect(() => {
    if (authLoading || !session?.access_token) return;

    let isMounted = true;

    const loadInitialGuests = async () => {
      await Promise.resolve();
      if (!isMounted) return;

      setLoadingGuests(true);
      setErrorMsg("");

      try {
        const { data, error } = await supabase
          .from("guests")
          .select("*")
          .order("created_at", { ascending: false });

        if (!isMounted) return;

        if (error) {
          console.error("Supabase fetch error:", error);
          setErrorMsg(error.message || "Failed to load guests from database.");
          setGuests([]);
        } else if (data) {
          setGuests(data);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Supabase query exception:", err);
        setErrorMsg(err.message || "Unexpected error querying database.");
        setGuests([]);
      } finally {
        if (isMounted) {
          setLoadingGuests(false);
        }
      }
    };

    loadInitialGuests();

    const channelId = `admin-guests-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let channel = null;

    const setupRealtime = async () => {
      if (session?.access_token) {
        try {
          await supabase.realtime.setAuth(session.access_token);
        } catch (authErr) {
          console.warn("[Realtime] setAuth notice:", authErr);
        }
      }

      if (!isMounted) return;

      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "guests",
          },
          (payload) => {
            if (!isMounted) return;

            const { eventType, new: newRecord, old: oldRecord } = payload;

            if (eventType === "INSERT" && newRecord?.id) {
              setGuests((prev) => {
                if (prev.some((g) => g.id === newRecord.id)) {
                  return prev.map((g) =>
                    g.id === newRecord.id ? { ...g, ...newRecord } : g,
                  );
                }
                return [newRecord, ...prev];
              });
            } else if (eventType === "UPDATE" && newRecord?.id) {
              setGuests((prev) =>
                prev.map((g) =>
                  g.id === newRecord.id ? { ...g, ...newRecord } : g,
                ),
              );
            } else if (eventType === "DELETE" && oldRecord?.id) {
              setGuests((prev) => prev.filter((g) => g.id !== oldRecord.id));
              // If deleted guest was currently selected in drawer, close drawer cleanly
              setSelectedGuestId((prevId) =>
                prevId === oldRecord.id ? null : prevId,
              );
            }
          },
        )
        .subscribe((status, err) => {
          if (!isMounted) return;
          if (status === "SUBSCRIBED") {
            setRealtimeStatus("connected");
          } else if (status === "CHANNEL_ERROR") {
            console.warn("[Realtime] Subscription error:", err);
            setRealtimeStatus("error");
            handleReconnection();
          } else if (status === "CLOSED" || status === "TIMED_OUT") {
            setRealtimeStatus("connecting");
            handleReconnection();
          }
        });
    };

    setupRealtime();

    const handleReconnection = async () => {
      if (document.visibilityState === "visible" || navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from("guests")
            .select("*")
            .order("created_at", { ascending: false });
          if (!error && data && isMounted) {
            setGuests(data);
          }
        } catch {
          // ignore background sync errors
        }
      }
    };

    window.addEventListener("online", handleReconnection);
    window.addEventListener("focus", handleReconnection);
    document.addEventListener("visibilitychange", handleReconnection);

    const syncInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        handleReconnection();
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      window.removeEventListener("online", handleReconnection);
      window.removeEventListener("focus", handleReconnection);
      document.removeEventListener("visibilitychange", handleReconnection);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [authLoading, session?.access_token]);

  // 4. Add Guest: supports custom slug or automatic slug fallback
  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!newGuestName.trim()) return;

    if (!session?.access_token) {
      setErrorMsg("Your session has expired. Please sign in again.");
      return;
    }

    setIsAdding(true);
    setErrorMsg("");

    try {
      const token = generateInvitationToken();
      const cleanCustomSlug = newGuestSlug.trim()
        ? normalizeSlug(newGuestSlug, { stripEdges: true })
        : "";

      let candidateSlug = cleanCustomSlug;
      if (cleanCustomSlug) {
        const uniqueness = await checkSlugIsUnique(cleanCustomSlug, null, guests);
        if (!uniqueness.isUnique) {
          setErrorMsg(
            uniqueness.error ||
              `The slug "${cleanCustomSlug}" is already in use.`,
          );
          return;
        }
      } else {
        candidateSlug = generateGuestSlug(newGuestName.trim(), guests);
      }

      const { data, error } = await insertGuest({
        guestName: newGuestName.trim(),
        token,
        slug: candidateSlug,
      });

      if (error) {
        console.error("Supabase INSERT error:", error);
        if (error.code === "23505") {
          setErrorMsg(
            `The slug "${candidateSlug}" is already in use by another guest. Please choose a different custom slug.`,
          );
        } else {
          setErrorMsg(
            error.message ||
              "Failed to insert guest into database. Verify Supabase Auth session and RLS permissions.",
          );
        }
        return;
      }

      if (data) {
        setGuests((prev) => {
          if (prev.some((g) => g.id === data.id)) {
            return prev;
          }
          return [data, ...prev];
        });
        setNewGuestName("");
        setNewGuestSlug("");
        // Automatically select the newly created guest to open drawer immediately
        setSelectedGuestId(data.id);
      }
    } catch (err) {
      console.error("Exception in handleAddGuest:", err);
      setErrorMsg(err.message || "An unexpected error occurred while adding guest.");
    } finally {
      setIsAdding(false);
    }
  };

  // 5. Delete Guest: opens the matching Admin Delete Confirmation Dialog
  const handleDeleteGuest = (guest) => {
    if (!guest || !guest.id) return;
    setErrorMsg("");
    setGuestToDelete(guest);
  };

  const handleConfirmDelete = async () => {
    if (!guestToDelete || !guestToDelete.id) return;

    if (!session?.access_token) {
      setErrorMsg("Your session has expired. Please sign in again.");
      setGuestToDelete(null);
      return;
    }

    setDeletingId(guestToDelete.id);
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("guests")
        .delete()
        .eq("id", guestToDelete.id);

      if (error) {
        console.error("Supabase DELETE error:", error);
        setErrorMsg(error.message || "Failed to delete guest from database.");
        return;
      }

      setGuests((prev) => prev.filter((g) => g.id !== guestToDelete.id));
      if (selectedGuestId === guestToDelete.id) {
        setSelectedGuestId(null);
      }
      setGuestToDelete(null);
    } catch (err) {
      console.error("Exception in handleConfirmDelete:", err);
      setErrorMsg(err.message || "Failed to delete guest from database.");
    } finally {
      setDeletingId(null);
    }
  };

  // 6. Save Edit: supports editing guest name and custom slug
  const handleSaveEdit = async (guestId, editName, editSlug) => {
    if (!editName.trim()) return false;

    if (!session?.access_token) {
      setErrorMsg("Your session has expired. Please sign in again.");
      return false;
    }

    const currentGuest = guests.find((g) => g.id === guestId);
    if (!currentGuest) return false;

    setIsSavingEdit(true);
    setErrorMsg("");

    try {
      const trimmedName = editName.trim();
      const cleanCustomSlug = editSlug.trim()
        ? normalizeSlug(editSlug, { stripEdges: true })
        : "";

      let finalSlug = currentGuest.invitation_slug || "";
      if (cleanCustomSlug) {
        if (cleanCustomSlug !== (currentGuest.invitation_slug || "")) {
          const uniqueness = await checkSlugIsUnique(
            cleanCustomSlug,
            guestId,
            guests,
          );
          if (!uniqueness.isUnique) {
            setErrorMsg(
              uniqueness.error ||
                `The slug "${cleanCustomSlug}" is already in use.`,
            );
            return false;
          }
        }
        finalSlug = cleanCustomSlug;
      } else if (!currentGuest.invitation_slug) {
        finalSlug = generateGuestSlug(trimmedName, guests, guestId);
      }

      if (!finalSlug) {
        setErrorMsg("A valid invitation slug is required.");
        return false;
      }

      const updatePayload = {
        guest_name: trimmedName,
        invitation_slug: finalSlug,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("guests")
        .update(updatePayload)
        .eq("id", guestId)
        .select()
        .single();

      if (error) {
        console.error("Supabase UPDATE error:", error);
        if (error.code === "23505") {
          setErrorMsg(
            `The slug "${finalSlug}" is already taken by another guest. Please choose a different slug.`,
          );
        } else {
          setErrorMsg(error.message || "Failed to update guest in database.");
        }
        return false;
      }

      setGuests((prev) =>
        prev.map((g) =>
          g.id === guestId
            ? {
                ...g,
                ...(data || {}),
                guest_name: trimmedName,
                invitation_slug: finalSlug,
              }
            : g,
        ),
      );

      return true;
    } catch (err) {
      console.error("Exception in handleSaveEdit:", err);
      setErrorMsg(err.message || "Failed to update guest in database.");
      return false;
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 7. Copy personalized invite link
  const handleCopyLink = async (guest) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const slug = guest.invitation_slug;
    if (!slug) {
      setErrorMsg("This guest does not have an invitation slug configured.");
      return;
    }
    const inviteUrl = `${origin}/invite/${encodeURIComponent(slug)}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedId(guest.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      window.prompt("Copy this invitation link:", inviteUrl);
    }
  };

  // 8. Handle Admin Logout
  const handleLogout = async () => {
    localStorage.removeItem("hm_admin_session");
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setSession(null);
    setGuests([]);
    setSelectedGuestId(null);
  };

  // Loading Screen while verifying session
  if (authLoading) {
    return (
      <div className="admin-loading-screen">
        <Loader2 size={36} className="spinner-icon" />
        <p className="font-serif">VERIFYING ADMIN ACCESS...</p>
      </div>
    );
  }

  // Render Login Page if not authenticated
  if (!session) {
    return (
      <AdminLogin
        onLoginSuccess={(sess) => {
          setSession(sess);
        }}
      />
    );
  }

  // Calculate statistics
  const totalGuests = guests.length;
  const acceptedGuests = guests.filter(
    (g) => g.rsvp_status === "accepted",
  ).length;
  const declinedGuests = guests.filter(
    (g) => g.rsvp_status === "declined",
  ).length;
  const pendingGuests = guests.filter(
    (g) => g.rsvp_status === "pending",
  ).length;

  // Filter guests by search (name or slug) & RSVP status
  const filteredGuests = guests.filter((g) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      g.guest_name.toLowerCase().includes(query) ||
      (g.invitation_slug && g.invitation_slug.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === "all" || g.rsvp_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate pagination slices
  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const paginatedGuests = filteredGuests.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="admin-dashboard-container">
      {/* Top Navigation Bar */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <div className="admin-brand-wrap">
            <div className="admin-brand-crest" aria-hidden="true">
              H&amp;M
            </div>
            <div className="admin-brand-text">
              <h1 className="admin-topbar-title font-serif">
                H&amp;M &bull; GUEST MANAGEMENT
              </h1>
              <p className="admin-topbar-khmer font-khmer">
                ប្រព័ន្ធគ្រប់គ្រងបញ្ជីភ្ញៀវកិត្តិយស
              </p>
            </div>
          </div>

          <div className="admin-topbar-user-wrap">
            <span className="admin-user-pill font-serif">
              {session.user?.email || "admin@invitation.com"}
            </span>

            <div
              className={`admin-realtime-badge ${realtimeStatus}`}
              title={
                realtimeStatus === "connected"
                  ? "Real-time sync active: cross-device updates appear automatically"
                  : realtimeStatus === "error"
                    ? "Real-time sync disconnected (click refresh if needed)"
                    : "Connecting real-time sync..."
              }
            >
              <span className="realtime-dot" aria-hidden="true" />
              <span className="realtime-text font-serif">
                {realtimeStatus === "connected"
                  ? "LIVE SYNC"
                  : realtimeStatus === "error"
                    ? "OFFLINE"
                    : "SYNCING..."}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-topbar-right">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-nav-link font-serif"
            title="Open wedding invitation website"
          >
            <Globe size={15} />
            <span>VIEW WEDDING SITE</span>
          </a>

          <button
            type="button"
            className="admin-logout-btn font-serif"
            onClick={handleLogout}
            title="Sign out of Admin Dashboard"
          >
            <LogOut size={15} />
            <span>LOGOUT</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="admin-main">
        {/* Statistics Cards */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card card-total">
            <div className="stat-accent-bar bar-total" />
            <div className="stat-card-icon icon-total">
              <Users size={24} />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label-khmer font-khmer">
                ភ្ញៀវសរុប
              </span>
              <span className="stat-card-label-en font-serif">
                TOTAL GUESTS
              </span>
              <strong className="stat-card-num font-serif">
                {totalGuests}
              </strong>
            </div>
          </div>

          <div className="admin-stat-card card-accepted">
            <div className="stat-accent-bar bar-accepted" />
            <div className="stat-card-icon icon-accepted">
              <CheckCircle2 size={24} />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label-khmer font-khmer">
                បានឆ្លើយតបចូលរួម
              </span>
              <span className="stat-card-label-en font-serif">ACCEPTED</span>
              <strong className="stat-card-num font-serif text-green">
                {acceptedGuests}
              </strong>
            </div>
          </div>

          <div className="admin-stat-card card-declined">
            <div className="stat-accent-bar bar-declined" />
            <div className="stat-card-icon icon-declined">
              <XCircle size={24} />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label-khmer font-khmer">
                មិនបានចូលរួម
              </span>
              <span className="stat-card-label-en font-serif">DECLINED</span>
              <strong className="stat-card-num font-serif text-red">
                {declinedGuests}
              </strong>
            </div>
          </div>

          <div className="admin-stat-card card-pending">
            <div className="stat-accent-bar bar-pending" />
            <div className="stat-card-icon icon-pending">
              <Clock size={24} />
            </div>
            <div className="stat-card-info">
              <span className="stat-card-label-khmer font-khmer">
                មិនទាន់ឆ្លើយតប
              </span>
              <span className="stat-card-label-en font-serif">PENDING</span>
              <strong className="stat-card-num font-serif text-gold">
                {pendingGuests}
              </strong>
            </div>
          </div>
        </div>

        {/* Add Guest Form */}
        <section
          className="admin-add-guest-card"
          aria-label="Add new wedding guest"
        >
          <div className="add-guest-header">
            <div className="add-guest-badge-wrap">
              <div className="add-guest-mini-badge">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="add-guest-title font-khmer-moul">
                  បន្ថែមភ្ញៀវកិត្តិយសថ្មី
                </h2>
                <p className="add-guest-subtitle font-serif">
                  INVITATION GENERATOR &bull; CREATES INSTANT READABLE SLUG
                </p>
              </div>
            </div>
            <p className="add-guest-hint font-khmer">
              បញ្ចូលឈ្មោះភ្ញៀវជាភាសាខ្មែរ ឬអង់គ្លេស ប្រព័ន្ធនឹងបង្កើតតំណភ្ជាប់{" "}
              <code className="hint-slug-code">/invite/guestname</code>{" "}
              ជូនដោយស្វ័យប្រវត្តិ។
            </p>
          </div>

          <form onSubmit={handleAddGuest} className="admin-add-form">
            <div className="admin-add-input-wrap">
              <UserPlus
                size={18}
                className="admin-input-icon-left"
                aria-hidden="true"
              />
              <input
                type="text"
                className="admin-add-input font-khmer"
                placeholder="ឈ្មោះភ្ញៀវ (ឧ. ឯកឧត្តម ជា សុខណៃ / Mr. Chea Soknai)..."
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
                disabled={isAdding}
                maxLength={150}
                required
              />
            </div>

            <div className="admin-add-slug-wrap">
              <Link2
                size={16}
                className="admin-input-icon-left"
                aria-hidden="true"
              />
              <span className="slug-input-prefix font-sans">/invite/</span>
              <input
                type="text"
                className="admin-add-slug-input font-sans"
                placeholder="custom-slug (optional, e.g. naiupdated)"
                value={newGuestSlug}
                onChange={(e) => setNewGuestSlug(normalizeSlug(e.target.value))}
                disabled={isAdding}
                maxLength={60}
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              className="admin-btn-add font-serif"
              disabled={isAdding || !newGuestName.trim()}
            >
              {isAdding ? (
                <>
                  <Loader2 size={16} className="spinner-icon" />
                  <span>ADDING GUEST...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>បន្ថែមភ្ញៀវ &bull; ADD GUEST</span>
                </>
              )}
            </button>
          </form>

          {/* Real-time slug preview hint */}
          {newGuestName.trim() && (
            <div className="admin-slug-preview-row">
              <span className="font-serif">Generated URL Preview:</span>
              <code className="hint-slug-code">
                /invite/
                {newGuestSlug
                  ? normalizeSlug(newGuestSlug, { stripEdges: true })
                  : generateGuestSlug(newGuestName, guests)}
              </code>
            </div>
          )}
        </section>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="admin-error-box font-khmer" role="alert">
            <p>
              <strong>Database Notice:</strong> {errorMsg}
            </p>
            {(errorMsg.toLowerCase().includes("permission denied") ||
              errorMsg.toLowerCase().includes("42501") ||
              errorMsg.includes("401")) && (
              <p
                style={{ marginTop: "6px", fontSize: "0.82rem", opacity: 0.9 }}
              >
                💡 <strong>How to fix:</strong> Please run the SQL permission
                script in Supabase SQL Editor (see{" "}
                <code>supabase/schema.sql</code>) to grant access to the table.
              </p>
            )}
          </div>
        )}

        {/* Guest Management Section: Responsive Interactive List */}
        <section className="admin-directory-section">
          {/* Directory Toolbar: Search, Filters, Refresh */}
          <div className="admin-table-toolbar">
            <div className="toolbar-search-wrap">
              <Search
                size={16}
                className="toolbar-search-icon"
                aria-hidden="true"
              />
              <input
                type="text"
                className="toolbar-search-input font-khmer"
                placeholder="ស្វែងរកតាមឈ្មោះ ឬ slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search query"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="toolbar-controls">
              {/* RSVP Status Filter Pills */}
              <div className="status-filter-pills font-serif">
                <button
                  type="button"
                  className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
                  onClick={() => setStatusFilter("all")}
                >
                  ALL ({totalGuests})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${statusFilter === "accepted" ? "active" : ""}`}
                  onClick={() => setStatusFilter("accepted")}
                >
                  ACCEPTED ({acceptedGuests})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${statusFilter === "declined" ? "active" : ""}`}
                  onClick={() => setStatusFilter("declined")}
                >
                  DECLINED ({declinedGuests})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${statusFilter === "pending" ? "active" : ""}`}
                  onClick={() => setStatusFilter("pending")}
                >
                  PENDING ({pendingGuests})
                </button>
              </div>

              {/* Manual Refresh Button */}
              <button
                type="button"
                className="toolbar-refresh-btn font-serif"
                onClick={fetchGuests}
                disabled={loadingGuests}
                title="Refresh guest list"
                aria-label="Refresh guest list"
              >
                <RefreshCw
                  size={15}
                  className={loadingGuests ? "spinner-icon" : ""}
                />
              </button>
            </div>
          </div>

          {/* Guest List State & Cards */}
          {loadingGuests && guests.length === 0 ? (
            <div className="admin-list-loading font-khmer">
              <Loader2 size={24} className="spinner-icon" />
              <span>កំពុងទាញយកបញ្ជីភ្ញៀវ... (Loading guests...)</span>
            </div>
          ) : filteredGuests.length === 0 ? (
            <div className="admin-empty-state-card font-khmer">
              <div className="empty-state-icon-wrap">
                <Users size={32} />
              </div>
              <h3 className="empty-state-title">
                រកមិនឃើញភ្ញៀវក្នុងបញ្ជីទេ
              </h3>
              <p className="empty-state-sub-khmer">
                {searchQuery || statusFilter !== "all"
                  ? "គ្មានភ្ញៀវដែលត្រូវគ្នានឹងការស្វែងរករបស់អ្នកទេ។ សូមសាកល្បងស្វែងរកម្តងទៀត។"
                  : "សូមបញ្ចូលឈ្មោះភ្ញៀវក្នុងប្រអប់ខាងលើ ដើម្បីបង្កើតតំណភ្ជាប់លិខិតអញ្ជើញ។"}
              </p>
              <span className="empty-state-sub-en font-serif">
                {searchQuery || statusFilter !== "all"
                  ? "No matching guests found. Try adjusting your search query or filter."
                  : "No guests registered yet. Use the Add Guest form above to begin."}
              </span>
            </div>
          ) : (
            <>
              {/* Responsive Interactive Guest Cards List */}
              <div
                className="admin-guest-cards-list"
                role="list"
                aria-label="Guest Directory"
              >
                {paginatedGuests.map((guest) => {
                  const isCopied = copiedId === guest.id;
                  const isSelected = selectedGuestId === guest.id;
                  const firstLetter = (guest.guest_name || "G")
                    .trim()
                    .charAt(0)
                    .toUpperCase();
                  const slug = guest.invitation_slug || "";

                  return (
                    <div
                      key={guest.id}
                      className={`admin-guest-item-card ${isSelected ? "is-active-selection" : ""}`}
                      onClick={() => setSelectedGuestId(guest.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedGuestId(guest.id);
                        }
                      }}
                      aria-label={`View details for ${guest.guest_name}`}
                    >
                      {/* Left: Avatar & Identity Details */}
                      <div className="guest-item-main">
                        <div className="guest-avatar-circle font-khmer">
                          {firstLetter}
                        </div>

                        <div className="guest-item-info">
                          <div className="guest-item-name-row">
                            <span className="guest-item-name font-khmer">
                              {guest.guest_name}
                            </span>
                          </div>

                          <div className="guest-item-meta-row">
                            <span className="guest-item-slug">
                              <span className="slug-prefix">/invite/</span>
                              <span className="slug-value">
                                {slug || "(no slug)"}
                              </span>
                            </span>

                            {guest.created_at && (
                              <span className="guest-item-date font-serif">
                                <Calendar size={11} />
                                {new Date(
                                  guest.created_at,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: RSVP Status Pill, Quick Copy, and Chevron Indicator */}
                      <div className="guest-item-controls">
                        <span
                          className={`status-pill status-${guest.rsvp_status} font-serif`}
                        >
                          {guest.rsvp_status === "accepted" && (
                            <CheckCircle2 size={12} />
                          )}
                          {guest.rsvp_status === "declined" && (
                            <XCircle size={12} />
                          )}
                          {guest.rsvp_status === "pending" && (
                            <Clock size={12} />
                          )}
                          <span>{guest.rsvp_status.toUpperCase()}</span>
                        </span>

                        <button
                          type="button"
                          className={`guest-item-copy-btn ${isCopied ? "is-copied" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(guest);
                          }}
                          disabled={!slug}
                          title={
                            slug
                              ? "Copy personalized invitation link"
                              : "No slug configured"
                          }
                          aria-label="Copy invitation link"
                        >
                          {isCopied ? (
                            <>
                              <Check size={12} />
                              <span className="copy-btn-text">COPIED</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span className="copy-btn-text">COPY</span>
                            </>
                          )}
                        </button>

                        <div
                          className="guest-item-chevron-icon"
                          aria-hidden="true"
                        >
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Responsive Pagination Controls */}
              {totalPages > 1 && (
                <div className="admin-pagination-bar font-serif">
                  <div className="pagination-count-label">
                    Showing{" "}
                    <strong>
                      {startIndex + 1}&ndash;
                      {Math.min(startIndex + itemsPerPage, filteredGuests.length)}
                    </strong>{" "}
                    of <strong>{filteredGuests.length}</strong> guests
                  </div>

                  <div className="pagination-actions">
                    <button
                      type="button"
                      className="pagination-btn nav-btn"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={validCurrentPage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={16} />
                      <span className="pagination-btn-text">PREV</span>
                    </button>

                    <div className="pagination-pages-wrap">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (pageNum) => (
                          <button
                            key={pageNum}
                            type="button"
                            className={`pagination-page-number ${
                              validCurrentPage === pageNum ? "active" : ""
                            }`}
                            onClick={() => setCurrentPage(pageNum)}
                            aria-label={`Go to page ${pageNum}`}
                            aria-current={
                              validCurrentPage === pageNum ? "page" : undefined
                            }
                          >
                            {pageNum}
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      className="pagination-btn nav-btn"
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages),
                        )
                      }
                      disabled={validCurrentPage === totalPages}
                      aria-label="Next page"
                    >
                      <span className="pagination-btn-text">NEXT</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* Dedicated Guest Detail View (Slide-over Drawer on Desktop, Responsive Bottom-Sheet on Mobile) */}
      <GuestDetailDrawer
        isOpen={Boolean(selectedGuestId && selectedGuest)}
        guest={selectedGuest}
        onClose={() => setSelectedGuestId(null)}
        onCopyLink={handleCopyLink}
        isCopied={Boolean(selectedGuestId && copiedId === selectedGuestId)}
        onDelete={handleDeleteGuest}
        onSaveEdit={handleSaveEdit}
        isSavingEdit={isSavingEdit}
        editError={errorMsg}
        clearEditError={() => setErrorMsg("")}
      />

      {/* Delete Confirmation Modal matching Admin Dashboard Design System */}
      <DeleteConfirmationModal
        isOpen={Boolean(guestToDelete)}
        itemName={guestToDelete?.guest_name}
        itemDetails={
          guestToDelete
            ? `Slug: /invite/${guestToDelete.invitation_slug || "..."}`
            : undefined
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setGuestToDelete(null)}
        isDeleting={Boolean(guestToDelete && deletingId === guestToDelete.id)}
      />
    </div>
  );
}
