import { useState, useEffect, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  Search,
  Copy,
  ExternalLink,
  Trash2,
  Edit2,
  LogOut,
  RefreshCw,
  Check,
  Globe,
  Loader2,
  Link2,
  X,
  ChevronRight,
  MessageSquare,
  Eye,
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

/**
 * AdminDashboard Component
 *
 * Secure Administrator Portal for Digital Wedding Invitation H&M.
 * Strictly uses Supabase Auth as the single source of truth.
 * Supports custom invitation slugs with automatic normalization & duplicate validation.
 * Full CRUD operations persist directly to Supabase public.guests PostgreSQL table
 * under Row Level Security (RLS) with the 'authenticated' role.
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

  // Inline editing state: guest ID string or null
  const [editingGuest, setEditingGuest] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Copied link feedback: guestId string or null
  const [copiedId, setCopiedId] = useState(null);

  // Deleting in-flight state: guestId string or null
  const [deletingId, setDeletingId] = useState(null);
  // Selected guest for custom Delete Confirmation Dialog (null when closed)
  const [guestToDelete, setGuestToDelete] = useState(null);

  // Selected guest for Detail View (Left-side Drawer on Desktop, Bottom Sheet on Mobile)
  const [selectedGuest, setSelectedGuest] = useState(null);

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (guestToDelete && !deletingId) {
          setGuestToDelete(null);
        } else if (selectedGuest && !isSavingEdit) {
          setSelectedGuest(null);
          setEditingGuest(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guestToDelete, deletingId, selectedGuest, isSavingEdit]);

  // Lock background body scroll whenever detail drawer or delete modal is active
  useEffect(() => {
    if (selectedGuest || guestToDelete) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      document.documentElement.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
        document.documentElement.style.overflow = "";
      };
    }
  }, [selectedGuest, guestToDelete]);

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
      // Verify active session before querying
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

    // A. Initial data load
    const loadInitialGuests = async () => {
      // Async boundary prevents synchronous setState cascade
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

    // B. Set up Supabase Realtime channel for live cross-device synchronization
    // Generates a unique channel ID per mount to avoid React 19 StrictMode topic collisions
    const channelId = `admin-guests-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    let channel = null;

    const setupRealtime = async () => {
      // Ensure WebSocket connection is authenticated with user's JWT so RLS allows receiving events
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
            console.log(
              `[Realtime] ${eventType} event received:`,
              newRecord || oldRecord,
            );

            if (eventType === "INSERT" && newRecord?.id) {
              setGuests((prev) => {
                // Deduplicate: if guest with this ID already exists, update in-place with latest db state
                if (prev.some((g) => g.id === newRecord.id)) {
                  return prev.map((g) =>
                    g.id === newRecord.id ? { ...g, ...newRecord } : g,
                  );
                }
                // Prepend newly inserted guest so it appears immediately at top of list
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
            }
          },
        )
        .subscribe((status, err) => {
          if (!isMounted) return;
          console.log(`[Realtime] Subscription status [${channelId}]:`, status);
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

    // C. Reconcile on focus, reconnect, or tab visibility change
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

    // D. Periodic fallback heartbeat sync (every 10 seconds while tab is active)
    const syncInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        handleReconnection();
      }
    }, 10000);

    // E. Cleanup on unmount or session change
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

      // Determine slug: if custom slug is provided, validate uniqueness
      let candidateSlug = cleanCustomSlug;
      if (cleanCustomSlug) {
        const uniqueness = await checkSlugIsUnique(
          cleanCustomSlug,
          null,
          guests,
        );
        if (!uniqueness.isUnique) {
          setErrorMsg(
            uniqueness.error ||
              `The slug "${cleanCustomSlug}" is already in use.`,
          );
          return;
        }
      } else {
        // If left empty, fallback to automatic slug generated from guest name
        candidateSlug = generateGuestSlug(newGuestName.trim(), guests);
      }

      // Call insertGuest service which executes await supabase.from("guests").insert(...)
      const { data, error } = await insertGuest({
        guestName: newGuestName.trim(),
        token,
        slug: candidateSlug,
      });

      // Check error: if insert failed, display error and NEVER add to React state
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

      // Database confirmed! Only now update React state
      if (data) {
        setGuests((prev) => {
          if (prev.some((g) => g.id === data.id)) {
            return prev;
          }
          return [data, ...prev];
        });
        setNewGuestName("");
        setNewGuestSlug("");
      }
    } catch (err) {
      console.error("Exception in handleAddGuest:", err);
      setErrorMsg(
        err.message || "An unexpected error occurred while adding guest.",
      );
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

      // Only update state after database confirms deletion
      setGuests((prev) => prev.filter((g) => g.id !== guestToDelete.id));
      if (selectedGuest?.id === guestToDelete.id) {
        setSelectedGuest(null);
      }
      setGuestToDelete(null);
    } catch (err) {
      console.error("Exception in handleConfirmDelete:", err);
      setErrorMsg(err.message || "Failed to delete guest from database.");
    } finally {
      setDeletingId(null);
    }
  };

  // 6. Edit Guest: supports editing both Guest Name and Custom Slug
  const handleStartEdit = (guest) => {
    setEditingGuest(guest.id);
    setEditName(guest.guest_name || "");
    setEditSlug(guest.invitation_slug || "");
    setErrorMsg("");
  };

  const handleSaveEdit = async (guestId) => {
    if (!editName.trim()) return;

    if (!session?.access_token) {
      setErrorMsg("Your session has expired. Please sign in again.");
      return;
    }

    const currentGuest = guests.find((g) => g.id === guestId);
    if (!currentGuest) return;

    setIsSavingEdit(true);
    setErrorMsg("");

    try {
      const trimmedName = editName.trim();
      const cleanCustomSlug = editSlug.trim()
        ? normalizeSlug(editSlug, { stripEdges: true })
        : "";

      // Determine final slug:
      // If Admin entered a slug, validate uniqueness unless unchanged
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
            return;
          }
        }
        finalSlug = cleanCustomSlug;
      } else if (!currentGuest.invitation_slug) {
        // If guest has no slug yet and field is left empty, generate automatic slug
        finalSlug = generateGuestSlug(trimmedName, guests, guestId);
      }

      if (!finalSlug) {
        setErrorMsg("A valid invitation slug is required.");
        return;
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
        return;
      }

      // Database confirmed! Only now update state
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

      setSelectedGuest((prev) =>
        prev && prev.id === guestId
          ? {
              ...prev,
              ...(data || {}),
              guest_name: trimmedName,
              invitation_slug: finalSlug,
            }
          : prev,
      );

      setEditingGuest(null);
      setEditName("");
      setEditSlug("");
    } catch (err) {
      console.error("Exception in handleSaveEdit:", err);
      setErrorMsg(err.message || "Failed to update guest in database.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // 7. Copy personalized invite link using stored guest invitation_slug
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
            <div
              style={{
                marginTop: "10px",
                fontSize: "0.82rem",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <span className="font-serif">Generated URL Preview:</span>
              <code
                className="hint-slug-code"
                style={{
                  color: "var(--color-burgundy)",
                  fontWeight: 700,
                  background: "#fbf9f5",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  border: "1px solid rgba(181, 155, 109, 0.3)",
                }}
              >
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

        {/* Guest Management Table Section */}
        <section className="admin-table-section">
          {/* Table Toolbar: Search, Filters, Refresh */}
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
                title="Refresh list"
              >
                <RefreshCw
                  size={15}
                  className={loadingGuests ? "spinner-icon" : ""}
                />
              </button>
            </div>
          </div>

          {/* Desktop/Tablet View (768px and above): PRESERVED Table Layout */}
          <div className="admin-desktop-view">
            <div className="admin-table-responsive">
              <table className="admin-guest-table">
                <thead>
                  <tr>
                    <th className="font-serif">GUEST NAME</th>
                    <th className="font-serif">RSVP STATUS</th>
                    <th className="font-serif">INVITATION LINK</th>
                    <th className="font-serif">MESSAGE / NOTE</th>
                    <th className="font-serif">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingGuests && guests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-table-loading font-khmer">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "2rem",
                          }}
                        >
                          <Loader2 size={24} className="spinner-icon" />
                          <span>កំពុងទាញយកបញ្ជីភ្ញៀវ... (Loading guests...)</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredGuests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-empty-state-cell">
                        <div className="admin-empty-state-card font-khmer">
                          <div className="empty-state-icon-wrap">
                            <Users size={32} />
                          </div>
                          <h3 className="empty-state-title">
                            រកមិនឃើញភ្ញៀវក្នុងបញ្ជីទេ
                          </h3>
                          <p className="empty-state-sub-khmer">
                            សូមបញ្ចូលឈ្មោះភ្ញៀវក្នុងប្រអប់
                            &ldquo;បន្ថែមភ្ញៀវកិត្តិយសថ្មី&rdquo; ខាងលើ
                            ដើម្បីបង្កើតតំណភ្ជាប់លិខិតអញ្ជើញ។
                          </p>
                          <span className="empty-state-sub-en font-serif">
                            No guests found. Use the &ldquo;ADD GUEST&rdquo; form
                            above to add a guest and generate their personalized
                            link.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredGuests.map((guest) => {
                      const isEditing = editingGuest === guest.id;
                      const isCopied = copiedId === guest.id;
                      const origin =
                        typeof window !== "undefined"
                          ? window.location.origin
                          : "";
                      const slug = guest.invitation_slug || "";
                      const inviteUrl = slug
                        ? `${origin}/invite/${encodeURIComponent(slug)}`
                        : "";
                      const firstLetter = (guest.guest_name || "G")
                        .trim()
                        .charAt(0)
                        .toUpperCase();

                      return (
                        <tr
                          key={guest.id}
                          className={`admin-guest-row ${selectedGuest?.id === guest.id ? "is-selected-row" : ""}`}
                          onClick={() => {
                            setSelectedGuest(guest);
                            setEditingGuest(null);
                          }}
                          title="Click to view details on left side"
                        >
                          {/* Guest Name Column */}
                          <td className="guest-name-cell">
                            {isEditing ? (
                              <div
                                className="inline-edit-wrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="inline-edit-field">
                                  <label className="inline-edit-label font-khmer">
                                    ឈ្មោះភ្ញៀវ / Guest Name:
                                  </label>
                                  <input
                                    type="text"
                                    className="inline-edit-input font-khmer"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    autoFocus
                                    disabled={isSavingEdit}
                                    maxLength={150}
                                  />
                                </div>

                                <div className="inline-edit-field">
                                  <label className="inline-edit-label font-serif">
                                    Custom Slug:
                                  </label>
                                  <div className="inline-slug-box">
                                    <span className="inline-slug-prefix font-sans">
                                      /invite/
                                    </span>
                                    <input
                                      type="text"
                                      className="inline-edit-slug-input font-sans"
                                      placeholder="custom-slug"
                                      value={editSlug}
                                      onChange={(e) =>
                                        setEditSlug(normalizeSlug(e.target.value))
                                      }
                                      disabled={isSavingEdit}
                                      maxLength={60}
                                    />
                                  </div>
                                </div>

                                <div className="inline-edit-actions">
                                  <button
                                    type="button"
                                    className="inline-save-btn font-serif"
                                    onClick={() => handleSaveEdit(guest.id)}
                                    disabled={isSavingEdit || !editName.trim()}
                                    title="Save changes"
                                  >
                                    {isSavingEdit ? "SAVING..." : "SAVE"}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-cancel-btn font-serif"
                                    onClick={() => {
                                      setEditingGuest(null);
                                      setEditName("");
                                      setEditSlug("");
                                    }}
                                    disabled={isSavingEdit}
                                    title="Cancel edit"
                                  >
                                    CANCEL
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="guest-name-wrapper">
                                <div className="guest-avatar-circle font-khmer">
                                  {firstLetter}
                                </div>
                                <div className="guest-name-details">
                                  <span className="guest-name-text font-khmer">
                                    {guest.guest_name}
                                  </span>
                                  {guest.created_at && (
                                    <span className="guest-time-text font-serif">
                                      {new Date(
                                        guest.created_at,
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* RSVP Status Column */}
                          <td className="guest-status-cell">
                            <span
                              className={`status-pill status-${guest.rsvp_status} font-serif`}
                            >
                              {guest.rsvp_status === "accepted" && (
                                <CheckCircle2 size={13} />
                              )}
                              {guest.rsvp_status === "declined" && (
                                <XCircle size={13} />
                              )}
                              {guest.rsvp_status === "pending" && (
                                <Clock size={13} />
                              )}
                              <span>{guest.rsvp_status.toUpperCase()}</span>
                            </span>
                          </td>

                          {/* Invitation Link Column */}
                          <td className="guest-link-cell">
                            <div className="guest-link-box">
                              <span className="guest-slug-badge">
                                <span className="slug-prefix">/invite/</span>
                                <strong className="slug-value">
                                  {slug || "(no slug set)"}
                                </strong>
                              </span>
                              <button
                                type="button"
                                className={`copy-link-btn ${isCopied ? "is-copied" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyLink(guest);
                                }}
                                disabled={!slug}
                                title={
                                  slug
                                    ? "Copy personalized invitation link"
                                    : "Guest has no invitation slug"
                                }
                              >
                                {isCopied ? (
                                  <>
                                    <Check size={13} />
                                    <span>COPIED!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} />
                                    <span>COPY</span>
                                  </>
                                )}
                              </button>

                              {inviteUrl && (
                                <a
                                  href={inviteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="open-link-icon-btn"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Open personalized invitation"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Message Column */}
                          <td className="guest-message-cell font-khmer">
                            {guest.rsvp_message ? (
                              <span
                                className="guest-msg-text"
                                title={guest.rsvp_message}
                              >
                                &ldquo;{guest.rsvp_message}&rdquo;
                              </span>
                            ) : (
                              <span className="no-message-text">&mdash;</span>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="guest-actions-cell">
                            <button
                              type="button"
                              className="action-icon-btn view-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGuest(guest);
                                setEditingGuest(null);
                              }}
                              title="View Details on Left Side"
                            >
                              <Eye size={15} />
                            </button>
                            <span> | </span>
                            <button
                              type="button"
                              className="action-icon-btn edit-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(guest);
                              }}
                              title="Edit Guest Name"
                            >
                              <Edit2 size={15} />
                            </button>
                            <span> | </span>
                            <button
                              type="button"
                              className="action-icon-btn delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGuest(guest);
                              }}
                              disabled={deletingId === guest.id}
                              title="Delete Guest"
                            >
                              {deletingId === guest.id ? (
                                <Loader2 size={15} className="spinner-icon" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View (up to 767px): Touch-Optimized Guest Cards */}
          <div className="admin-mobile-view">
            {loadingGuests && guests.length === 0 ? (
              <div className="admin-mobile-loading font-khmer">
                <Loader2 size={24} className="spinner-icon" />
                <span>កំពុងទាញយកបញ្ជីភ្ញៀវ... (Loading guests...)</span>
              </div>
            ) : filteredGuests.length === 0 ? (
              <div className="admin-mobile-empty-card font-khmer">
                <div className="empty-state-icon-wrap">
                  <Users size={32} />
                </div>
                <h3 className="empty-state-title">
                  រកមិនឃើញភ្ញៀវក្នុងបញ្ជីទេ
                </h3>
                <p className="empty-state-sub-khmer">
                  សូមបញ្ចូលឈ្មោះភ្ញៀវក្នុងប្រអប់
                  &ldquo;បន្ថែមភ្ញៀវកិត្តិយសថ្មី&rdquo; ខាងលើ
                  ដើម្បីបង្កើតតំណភ្ជាប់លិខិតអញ្ជើញ។
                </p>
                <span className="empty-state-sub-en font-serif">
                  No guests found. Use the &ldquo;ADD GUEST&rdquo; form above to add a guest and generate their personalized link.
                </span>
              </div>
            ) : (
              <div className="admin-mobile-card-list">
                {filteredGuests.map((guest) => {
                  const isCopied = copiedId === guest.id;
                  const origin =
                    typeof window !== "undefined"
                      ? window.location.origin
                      : "";
                  const slug = guest.invitation_slug || "";
                  const inviteUrl = slug
                    ? `${origin}/invite/${encodeURIComponent(slug)}`
                    : "";
                  const firstLetter = (guest.guest_name || "G")
                    .trim()
                    .charAt(0)
                    .toUpperCase();

                  return (
                    <div
                      key={guest.id}
                      className="admin-mobile-guest-card"
                      onClick={() => {
                        setSelectedGuest(guest);
                        setEditingGuest(null);
                        setEditName("");
                        setEditSlug("");
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedGuest(guest);
                        }
                      }}
                    >
                      <div className="mobile-card-top">
                        <div className="mobile-card-identity">
                          <div className="guest-avatar-circle font-khmer">
                            {firstLetter}
                          </div>
                          <div className="mobile-guest-info">
                            <h3 className="mobile-guest-name font-khmer">
                              {guest.guest_name}
                            </h3>
                            <span className="mobile-guest-slug font-sans">
                              /invite/{slug || "(no slug set)"}
                            </span>
                          </div>
                        </div>

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
                      </div>

                      {guest.rsvp_message && (
                        <div className="mobile-card-message font-khmer">
                          <MessageSquare size={13} className="mobile-msg-icon" />
                          <p className="mobile-msg-text">
                            &ldquo;{guest.rsvp_message}&rdquo;
                          </p>
                        </div>
                      )}

                      <div
                        className="mobile-card-actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className={`mobile-card-btn copy-btn ${isCopied ? "is-copied" : ""}`}
                          onClick={() => handleCopyLink(guest)}
                          disabled={!slug}
                          title="Copy invitation link"
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span>{isCopied ? "COPIED" : "COPY LINK"}</span>
                        </button>

                        {inviteUrl && (
                          <a
                            href={inviteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mobile-card-btn open-btn"
                            title="Open invitation in new tab"
                          >
                            <ExternalLink size={14} />
                            <span>OPEN</span>
                          </a>
                        )}

                        <button
                          type="button"
                          className="mobile-card-btn details-btn"
                          onClick={() => {
                            setSelectedGuest(guest);
                            setEditingGuest(null);
                            setEditName("");
                            setEditSlug("");
                          }}
                          title="View guest details"
                        >
                          <span>DETAILS</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Guest Detail View: Slide-in Drawer on the LEFT for Desktop, Bottom Sheet for Mobile */}
      {selectedGuest && (
        <div
          className="admin-detail-drawer-overlay"
          onClick={() => {
            setSelectedGuest(null);
            setEditingGuest(null);
          }}
          onTouchMove={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Guest details"
        >
          <div
            className="admin-detail-drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle Bar */}
            <div className="mobile-sheet-handle-bar" aria-hidden="true">
              <span className="mobile-sheet-drag-handle" />
            </div>

            {/* Drawer Header */}
            <div className="drawer-panel-header">
              <div className="drawer-header-left">
                <div className="drawer-avatar font-khmer">
                  {(selectedGuest.guest_name || "G")
                    .trim()
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="drawer-header-text">
                  <h3 className="drawer-guest-name font-khmer">
                    {selectedGuest.guest_name}
                  </h3>
                  <span className="drawer-sub">
                    GUEST DETAILS &bull; ព័ត៌មានភ្ញៀវ
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => {
                  setSelectedGuest(null);
                  setEditingGuest(null);
                }}
                aria-label="Close guest details"
                title="Close (Escape)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="drawer-panel-body">
              {editingGuest === selectedGuest.id ? (
                /* Inline Edit Form inside Drawer */
                <div className="drawer-edit-box">
                  <div className="drawer-field">
                    <label className="drawer-field-label font-khmer">
                      ឈ្មោះភ្ញៀវ / Guest Name:
                    </label>
                    <input
                      type="text"
                      className="drawer-input font-khmer"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      disabled={isSavingEdit}
                      maxLength={150}
                    />
                  </div>

                  <div className="drawer-field">
                    <label className="drawer-field-label">
                      Custom Slug (/invite/...):
                    </label>
                    <div className="drawer-slug-input-wrap">
                      <span className="slug-input-prefix font-sans">
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
                  </div>

                  <div className="drawer-edit-actions">
                    <button
                      type="button"
                      className="drawer-btn-save"
                      onClick={async () => {
                        await handleSaveEdit(selectedGuest.id);
                        setSelectedGuest((prev) =>
                          prev
                            ? {
                                ...prev,
                                guest_name: editName.trim(),
                                invitation_slug: editSlug.trim()
                                  ? normalizeSlug(editSlug, {
                                      stripEdges: true,
                                    })
                                  : prev.invitation_slug,
                              }
                            : null,
                        );
                      }}
                      disabled={isSavingEdit || !editName.trim()}
                    >
                      {isSavingEdit ? (
                        <>
                          <Loader2 size={16} className="spinner-icon" />
                          <span>SAVING...</span>
                        </>
                      ) : (
                        <span>រក្សាទុក &bull; SAVE CHANGES</span>
                      )}
                    </button>

                    <button
                      type="button"
                      className="drawer-btn-cancel"
                      onClick={() => {
                        setEditingGuest(null);
                        setEditName("");
                        setEditSlug("");
                      }}
                      disabled={isSavingEdit}
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                /* Guest Detail Cards */
                <>
                  {/* Status & Timing Box */}
                  <div className="drawer-card-section">
                    <div className="drawer-detail-row">
                      <span className="detail-meta-label">
                        RSVP STATUS
                      </span>
                      <span
                        className={`status-pill status-${selectedGuest.rsvp_status}`}
                      >
                        {selectedGuest.rsvp_status === "accepted" && (
                          <CheckCircle2 size={13} />
                        )}
                        {selectedGuest.rsvp_status === "declined" && (
                          <XCircle size={13} />
                        )}
                        {selectedGuest.rsvp_status === "pending" && (
                          <Clock size={13} />
                        )}
                        <span>
                          {selectedGuest.rsvp_status === "accepted" && "បានចូលរួម • ATTENDING"}
                          {selectedGuest.rsvp_status === "declined" && "មិនបានចូលរួម • DECLINED"}
                          {selectedGuest.rsvp_status === "pending" && "រង់ចាំឆ្លើយតប • PENDING"}
                        </span>
                      </span>
                    </div>

                    {selectedGuest.created_at && (
                      <div className="drawer-detail-row drawer-date-row">
                        <span className="detail-meta-label">
                          CREATED DATE
                        </span>
                        <span className="detail-meta-val">
                          {new Date(selectedGuest.created_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Personalized Link Box */}
                  <div className="drawer-card-section">
                    <div className="section-title-wrap">
                      <Link2 size={14} className="section-title-icon" />
                      <span className="detail-section-title">
                        PERSONALIZED INVITATION LINK
                      </span>
                    </div>

                    <div className="drawer-slug-preview-box">
                      <span className="slug-preview-prefix">/invite/</span>
                      <span className="slug-preview-name">
                        {selectedGuest.invitation_slug || "(no-slug)"}
                      </span>
                    </div>

                    <div className="drawer-link-btns-row">
                      <button
                        type="button"
                        className={`drawer-link-btn copy ${copiedId === selectedGuest.id ? "is-copied" : ""}`}
                        onClick={() => handleCopyLink(selectedGuest)}
                        disabled={!selectedGuest.invitation_slug}
                      >
                        {copiedId === selectedGuest.id ? (
                          <>
                            <Check size={16} />
                            <span>COPIED!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            <span>COPY LINK</span>
                          </>
                        )}
                      </button>

                      {selectedGuest.invitation_slug && (
                        <a
                          href={`${typeof window !== "undefined" ? window.location.origin : ""}/invite/${encodeURIComponent(selectedGuest.invitation_slug)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="drawer-link-btn open"
                        >
                          <ExternalLink size={16} />
                          <span>OPEN INVITATION</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Message & Blessings Box */}
                  <div className="drawer-card-section">
                    <div className="section-title-wrap">
                      <MessageSquare size={14} className="section-title-icon" />
                      <span className="detail-section-title">
                        RSVP MESSAGE &bull; សារជូនពរ
                      </span>
                    </div>
                    {selectedGuest.rsvp_message ? (
                      <div className="drawer-message-quote font-khmer">
                        <p className="quote-text">
                          &ldquo;{selectedGuest.rsvp_message}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="drawer-no-message">
                        <span>មិនទាន់មានសារជូនពរនៅឡើយទេ (No message submitted yet)</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Bottom Action Footer */}
            {editingGuest !== selectedGuest.id && (
              <div className="drawer-panel-footer">
                <button
                  type="button"
                  className="drawer-footer-btn edit"
                  onClick={() => handleStartEdit(selectedGuest)}
                >
                  <Edit2 size={16} />
                  <span>EDIT GUEST</span>
                </button>

                <button
                  type="button"
                  className="drawer-footer-btn delete"
                  onClick={() => {
                    const target = selectedGuest;
                    setSelectedGuest(null);
                    handleDeleteGuest(target);
                  }}
                >
                  <Trash2 size={16} />
                  <span>DELETE GUEST</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
