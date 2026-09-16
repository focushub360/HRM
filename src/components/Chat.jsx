import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "https://hrms-backend-22uq.onrender.com/api");

// Temporary — prints exactly which backend Chat.jsx is talking to. Remove
// this once you've confirmed it (search "TEMP DEBUG" to find it again).
console.log("TEMP DEBUG — Chat.jsx API_BASE:", API_BASE);

const AVATAR_COLORS = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777"];

// The backend's toJSON transform (idTransform) converts Mongoose's `_id` to
// `id` and removes `_id` on every document that goes over the wire — both
// REST responses AND Socket.IO payloads (socket.io also calls .toJSON()
// when serializing for transport). Every team/message object we receive
// therefore has `.id`, not `._id`. This app's reconciliation logic keys off
// `_id` throughout (React list keys, "is this the same team/message" checks,
// etc), so every object coming from the server or a socket event MUST be
// normalized the moment it enters state — otherwise every item ends up with
// `_id: undefined`, all keys collide, and any "find by _id" check matches
// EVERY item instead of one.
const normalizeId = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const realId = obj._id ?? obj.id;
  return { ...obj, _id: realId != null ? String(realId) : undefined, id: realId != null ? String(realId) : undefined };
};
const normalizeIds = (arr) => (Array.isArray(arr) ? arr.map(normalizeId) : []);

// FIX (teams showing twice / vanishing after refresh): whatever the server
// returns for /teams, we never trust it to already be unique. If the same
// team comes back more than once (e.g. a query that OR-matches a user as
// both `createdBy` and a `members` entry), or if an optimistic local add
// races with a socket "team-updated" echo, this collapses everything down
// to one entry per `_id` before it ever hits state. Last one in wins, which
// is fine since normalizeId makes every copy of the same doc identical.
const dedupeById = (arr) => {
  const map = new Map();
  (arr || []).forEach((item) => {
    if (item && item._id != null) map.set(String(item._id), item);
  });
  return Array.from(map.values());
};

// Build the set of every identifier a person could be known by. Different
// parts of the app resolve "who is this user" from different source
// documents (auth/user object vs. an employee-list entry vs. a team member
// sub-document), and those documents don't always have the same fields
// populated (e.g. one has empId, another only has id/email). Comparing a
// single collapsed id against a single collapsed id is exactly what was
// causing messages to "send" but never show up for the other person — the
// two sides were computing different strings for the same human. Comparing
// full candidate sets instead makes matching robust to that mismatch.
const candidateIds = (obj) =>
  new Set([obj?.empId, obj?.id, obj?._id, obj?.email].filter(Boolean).map(String));

const setsIntersect = (a, b) => {
  for (const v of a) if (b.has(v)) return true;
  return false;
};

const pickColor = (seed) => {
  const s = String(seed || "x");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

const Avatar = ({ name, img, size = 34, bg }) => (
  <div
    className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
    style={{
      width: size,
      height: size,
      backgroundColor: bg || pickColor(name),
      fontSize: size * 0.42,
      fontWeight: 600,
      overflow: "hidden"
    }}
  >
    {img ? (
      <img src={img} alt="" className="w-100 h-100" style={{ objectFit: "cover" }} />
    ) : (
      (name || "U").charAt(0).toUpperCase()
    )}
  </div>
);

// Small unread-count pill used next to team / DM names in the sidebar.
const UnreadBadge = ({ count }) => {
  if (!count) return null;
  return (
    <span
      className="d-inline-flex align-items-center justify-content-center flex-shrink-0"
      style={{
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 999,
        backgroundColor: "#ef4444",
        color: "#ffffff",
        fontSize: "0.68rem",
        fontWeight: 700,
        lineHeight: 1
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};

const MessageTicks = ({ message }) => {
  if (!message || message.isTemp) {
    return <i className="bi bi-clock text-muted" style={{ fontSize: "0.7rem" }} title="Sending..." />;
  }

  // FIX (tick shows "read" / green even though the other person never saw
  // it): the "mark channel as read" call fires for the CURRENT VIEWER every
  // time they open a channel — including the viewer opening a channel right
  // after they themselves sent a message in it. If that call (or the
  // backend behind it) adds the viewer's own id into readBy/deliveredTo
  // without excluding messages they authored, the sender's own id ends up
  // in the readBy list of their own message, and the tick flips to "read"
  // instantly regardless of what the actual recipient did. We defend
  // against that here by never counting the sender's own id/candidate ids
  // toward delivered/read counts — only counts from someone who ISN'T the
  // sender can turn the tick blue/green.
  const senderIdSet = candidateIds({
    empId: message.senderId,
    id: message.senderId,
    email: undefined
  });
  (message.senderCandidates || []).forEach((id) => id != null && senderIdSet.add(String(id)));

  const deliveredCount = (message.deliveredTo || []).filter((id) => !senderIdSet.has(String(id))).length;
  const readCount = (message.readBy || []).filter((id) => !senderIdSet.has(String(id))).length;

  let bg = "#111827";
  let color = "#ffffff";
  let icon = "bi-check";
  let title = "Sent";

  if (readCount > 0) {
    bg = "#22c55e";
    color = "#0b1a10";
    icon = "bi-check-all";
    title = "Read";
  } else if (deliveredCount > 0) {
    bg = "#111827";
    color = "#ffffff";
    icon = "bi-check-all";
    title = "Delivered";
  }

  return (
    <span
      title={title}
      className="d-inline-flex align-items-center justify-content-center"
      style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: bg, flexShrink: 0 }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: "0.6rem", color }}></i>
    </span>
  );
};

// A real, directly-clickable checkbox row, redrawn as a small selectable
// card rather than relying on the browser's native checkbox tick — on a
// dark theme the native tick (a background-image the browser paints on a
// checked <input>) frequently renders invisible because it isn't themed,
// so it LOOKS like nothing happens when you click. This draws its own
// checkbox glyph (a filled indigo square with a check icon) driven purely
// by the `checked` prop, so the "selected" state is always visible
// regardless of theme/browser. The real <input> is kept (visually hidden)
// so the row stays keyboard/screen-reader accessible and the <label>
// still natively toggles it on click.
const MemberPickRow = ({ uid, checked, onToggle, avatarName, avatarImg, avatarSize, title, subtitle }) => {
  const [hover, setHover] = useState(false);
  return (
    <label
      htmlFor={`member-${uid}`}
      className="d-flex align-items-center gap-2 p-2 rounded-3"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: "pointer",
        backgroundColor: checked ? "rgba(79,70,229,0.14)" : hover ? "rgba(148,163,184,0.08)" : "transparent",
        border: `1.5px solid ${checked ? "#4f46e5" : "transparent"}`,
        transition: "background-color 0.15s ease, border-color 0.15s ease"
      }}
    >
      <input
        id={`member-${uid}`}
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(uid)}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
      <span
        aria-hidden="true"
        className="d-flex align-items-center justify-content-center flex-shrink-0"
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          border: `2px solid ${checked ? "#4f46e5" : "var(--border-color, #9ca3af)"}`,
          backgroundColor: checked ? "#4f46e5" : "transparent",
          transition: "background-color 0.15s ease, border-color 0.15s ease"
        }}
      >
        {checked && <i className="bi bi-check-lg" style={{ fontSize: "0.8rem", color: "#ffffff", fontWeight: 700, lineHeight: 1 }}></i>}
      </span>
      <Avatar name={avatarName} img={avatarImg} size={avatarSize} />
      <div className="min-w-0 flex-grow-1">
        <div className="text-truncate small fw-semibold" style={{ color: "var(--text-main)" }}>
          {title}
        </div>
        {subtitle && (
          <div className="text-truncate text-muted" style={{ fontSize: "0.7rem" }}>
            {subtitle}
          </div>
        )}
      </div>
      {checked && (
        <span
          className="flex-shrink-0"
          style={{ fontSize: "0.65rem", fontWeight: 700, color: "#4f46e5", letterSpacing: "0.02em" }}
        >
          SELECTED
        </span>
      )}
    </label>
  );
};

// ---------------------------------------------------------------------------
// Create Team Modal
// ---------------------------------------------------------------------------

const CreateTeamModal = ({ show, onClose, candidates, onCreate }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) {
      setName("");
      setDescription("");
      setSelected(new Set());
      setQuery("");
      setSaving(false);
    }
  }, [show]);

  if (!show) return null;

  const filtered = candidates.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
  });

  const toggle = (uid) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const members = candidates.filter((c) => selected.has(c.empId || c.id || c.email));
    await onCreate({ name: name.trim(), description: description.trim(), members });
    setSaving(false);
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
      onClick={onClose}
    >
      <div
        className="rounded-4 shadow-lg d-flex flex-column"
        style={{ width: "440px", maxHeight: "80vh", backgroundColor: "var(--bg-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: "var(--border-color)" }}>
          <h6 className="mb-0 fw-bold" style={{ color: "var(--text-main)" }}>Create Team</h6>
          <button type="button" className="btn btn-sm btn-link text-muted" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="p-3" style={{ overflowY: "auto" }}>
          <label className="small fw-semibold mb-1" style={{ color: "var(--text-main)" }}>Team name</label>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="e.g. Product Launch"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
          />

          <label className="small fw-semibold mb-1" style={{ color: "var(--text-main)" }}>Description (optional)</label>
          <textarea
            className="form-control mb-3"
            rows={2}
            placeholder="What is this team about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
          />

          <label className="small fw-semibold mb-1" style={{ color: "var(--text-main)" }}>
            Add members ({selected.size} selected)
          </label>
          <div className="input-group input-group-sm mb-2">
            <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: "var(--border-color)", color: "var(--text-muted, #94a3b8)" }}>
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search coworker..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
            />
            {query && (
              <button
                type="button"
                className="btn btn-sm border-start-0"
                onClick={() => setQuery("")}
                style={{ borderColor: "var(--border-color)", color: "var(--text-muted, #94a3b8)" }}
                title="Clear search"
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
          <div
            className="border rounded-3 d-flex flex-column gap-1 p-1"
            style={{ maxHeight: "220px", overflowY: "auto", borderColor: "var(--border-color)", backgroundColor: "var(--bg-main)" }}
          >
            {filtered.length === 0 ? (
              <div className="text-center py-3 text-muted small">No coworkers found.</div>
            ) : (
              filtered.map((c) => {
                const uid = c.empId || c.id || c.email;
                return (
                  <MemberPickRow
                    key={uid}
                    uid={uid}
                    checked={selected.has(uid)}
                    onToggle={toggle}
                    avatarName={c.name || c.email}
                    avatarImg={c.profileImage}
                    avatarSize={28}
                    title={c.name || c.email}
                    subtitle={c.role || c.department || "Coworker"}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="p-3 border-top d-flex justify-content-end gap-2" style={{ borderColor: "var(--border-color)" }}>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary fw-semibold"
            disabled={!name.trim() || saving}
            onClick={handleCreate}
            style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", border: "none" }}
          >
            {saving ? "Creating..." : "Create Team"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Team Settings Modal
// ---------------------------------------------------------------------------

const TeamSettingsModal = ({ show, onClose, team, currentUserId, isAdmin, candidates, onEdit, onAddMembers, onRemoveMember, onLeave, onDelete }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name || "");
      setDescription(team.description || "");
    }
    setAddMode(false);
    setSelected(new Set());
    setQuery("");
  }, [team, show]);

  if (!show || !team) return null;

  const memberIds = new Set((team.members || []).map((m) => m.userId));
  const addCandidates = candidates.filter((c) => !memberIds.has(String(c.empId || c.id || c.email)));
  const filteredCandidates = addCandidates.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (c.name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q);
  });

  const toggle = (uid) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleSaveDetails = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    await onEdit({ name: name.trim(), description: description.trim() });
    setBusy(false);
  };

  const handleAdd = async () => {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    const members = addCandidates.filter((c) => selected.has(c.empId || c.id || c.email));
    await onAddMembers(members);
    setBusy(false);
    setAddMode(false);
    setSelected(new Set());
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
      onClick={onClose}
    >
      <div
        className="rounded-4 shadow-lg d-flex flex-column"
        style={{ width: "460px", maxHeight: "82vh", backgroundColor: "var(--bg-card)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: "var(--border-color)" }}>
          <h6 className="mb-0 fw-bold" style={{ color: "var(--text-main)" }}>Team Info</h6>
          <button type="button" className="btn btn-sm btn-link text-muted" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="p-3" style={{ overflowY: "auto" }}>
          {isAdmin ? (
            <>
              <label className="small fw-semibold mb-1" style={{ color: "var(--text-main)" }}>Team name</label>
              <input
                type="text"
                className="form-control mb-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
              />
              <label className="small fw-semibold mb-1" style={{ color: "var(--text-main)" }}>Description</label>
              <textarea
                className="form-control mb-2"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
              />
              <button
                type="button"
                className="btn btn-sm btn-primary mb-3"
                disabled={busy}
                onClick={handleSaveDetails}
                style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", border: "none" }}
              >
                Save changes
              </button>
            </>
          ) : (
            <>
              <h5 className="fw-bold mb-1" style={{ color: "var(--text-main)" }}>{team.name}</h5>
              {team.description && <p className="text-muted small mb-3">{team.description}</p>}
            </>
          )}

          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-uppercase fw-bold text-muted" style={{ fontSize: "0.72rem" }}>
              {(team.members || []).length} Members
            </span>
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setAddMode((v) => !v)}>
              <i className="bi bi-person-plus me-1"></i> Add
            </button>
          </div>

          {addMode && (
            <div className="mb-3 p-2 border rounded-3" style={{ borderColor: "var(--border-color)" }}>
              <div className="input-group input-group-sm mb-2">
                <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: "var(--border-color)", color: "var(--text-muted, #94a3b8)" }}>
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search coworker..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
                />
                {query && (
                  <button
                    type="button"
                    className="btn btn-sm border-start-0"
                    onClick={() => setQuery("")}
                    style={{ borderColor: "var(--border-color)", color: "var(--text-muted, #94a3b8)" }}
                    title="Clear search"
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
              <div className="d-flex flex-column gap-1" style={{ maxHeight: "160px", overflowY: "auto" }}>
                {filteredCandidates.length === 0 ? (
                  <div className="text-center py-2 text-muted small">Everyone is already in this team.</div>
                ) : (
                  filteredCandidates.map((c) => {
                    const uid = c.empId || c.id || c.email;
                    return (
                      <MemberPickRow
                        key={uid}
                        uid={uid}
                        checked={selected.has(uid)}
                        onToggle={toggle}
                        avatarName={c.name || c.email}
                        avatarImg={c.profileImage}
                        avatarSize={26}
                        title={c.name || c.email}
                      />
                    );
                  })
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-primary mt-2 w-100"
                disabled={selected.size === 0 || busy}
                onClick={handleAdd}
                style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", border: "none" }}
              >
                Add {selected.size > 0 ? selected.size : ""} member{selected.size === 1 ? "" : "s"}
              </button>
            </div>
          )}

          <div className="d-flex flex-column gap-1">
            {(team.members || []).map((m) => {
              // The person who created the team is their own distinct role
              // ("Team Leader") — not just another admin. Anyone else
              // promoted via setTeamAdmin still shows as "Admin". The
              // creator can never be removed by others (removeTeamMember
              // already enforces that server-side) and always keeps edit/
              // add/remove/delete rights even if later dropped from the
              // `admins` array, since isAdmin() checks createdBy first.
              const isCreator = team.createdBy === m.userId;
              const memberIsAdmin = isCreator || (team.admins || []).includes(m.userId);
              const roleLabel = isCreator ? "Team Leader" : memberIsAdmin ? "Admin" : m.role || "Member";
              const canRemove = isAdmin && m.userId !== currentUserId && !isCreator;
              return (
                <div key={m.userId} className="d-flex align-items-center gap-2 p-2 rounded-3">
                  <Avatar name={m.name} img={m.avatar} size={30} />
                  <div className="min-w-0 flex-grow-1">
                    <div className="text-truncate small fw-semibold" style={{ color: "var(--text-main)" }}>
                      {m.name} {m.userId === currentUserId && <span className="text-muted">(You)</span>}
                    </div>
                    <div className="text-truncate" style={{ fontSize: "0.7rem", color: isCreator ? "#4f46e5" : "var(--text-muted, #6b7280)", fontWeight: isCreator ? 600 : 400 }}>
                      {isCreator && <i className="bi bi-star-fill me-1" style={{ fontSize: "0.6rem" }}></i>}
                      {roleLabel}
                    </div>
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-0"
                      title="Remove from team"
                      onClick={() => onRemoveMember(m.userId)}
                    >
                      <i className="bi bi-person-dash"></i>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-top d-flex justify-content-between" style={{ borderColor: "var(--border-color)" }}>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onLeave}>
            <i className="bi bi-box-arrow-right me-1"></i> Leave Team
          </button>
          {isAdmin && (
            <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
              <i className="bi bi-trash me-1"></i> Delete Team
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Chat Component
// ---------------------------------------------------------------------------

const Chat = () => {
  const { user, companies, socket, setChatUnreadCount } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("company");
  const [targetGroup, setTargetGroup] = useState("");
  const [targetUser, setTargetUser] = useState(null);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [showTeamSearch, setShowTeamSearch] = useState(false);
  const [showDmSearch, setShowDmSearch] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  const [teams, setTeams] = useState([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [teamsExpanded, setTeamsExpanded] = useState(true);
  const [dmExpanded, setDmExpanded] = useState(true);

  const [unreadCounts, setUnreadCounts] = useState({ dm: {}, team: {} });

  // Tracks which company we've already pulled unread counts for, so the
  // (fairly heavy) per-team/per-DM fetch below only runs once per company
  // load rather than every time `teams` or `companyEmployees` re-renders.
  const unreadFetchedForCompany = useRef(null);

  const isSuperAdmin = !user?.companyId || user?.role === "admin";
  const isAdminOrHR = user?.type === "company" || user?.type === "hr" || isSuperAdmin;
  const [targetCompany, setTargetCompany] = useState(user?.companyId || "");

  const currentUserId = user?.empId || user?.id || user?.email;

  // FIX (Mohan never receives Raj's messages / tick lies about read state):
  // every "am I the sender / am I the recipient" check in this file used to
  // compare a single collapsed id (`empId || id || email`) computed
  // independently on each person's own client. If Raj's copy of Mohan's
  // employee record and Mohan's own logged-in user object don't have the
  // same field populated (one has empId, the other only id/email), the two
  // sides compute different strings for the same person and every identity
  // check silently fails. `myIds` is the full set of everything I could be
  // known as, so matching becomes "do any of my ids overlap with theirs"
  // instead of "does my one id exactly equal their one id".
  const myIds = useMemo(() => candidateIds(user), [user]);

  const isMessageMine = useCallback(
    (msg) => {
      if (!msg) return false;
      if (myIds.has(String(msg.senderId))) return true;
      return (msg.senderCandidates || []).some((id) => id != null && myIds.has(String(id)));
    },
    [myIds]
  );

  useEffect(() => {
    if (isSuperAdmin && companies?.length > 0 && !targetCompany) {
      setTargetCompany(companies[0].id);
    }
  }, [isSuperAdmin, companies, targetCompany]);

  const activeCompanyId = isSuperAdmin ? targetCompany : user?.companyId;
  const activeTeam = useMemo(() => teams.find((t) => t._id === activeTeamId) || null, [teams, activeTeamId]);

  // FIX (unread badge reappears after 1st refresh, then vanishes on the
  // 2nd+ refresh even though nothing was opened): computing "unread" from
  // the server's `readBy` field meant every refresh re-fetched each
  // channel's message list, and if the backend treats that GET (it's
  // called with `viewerId`) as a signal to mark things delivered/read as a
  // side effect, the SECOND fetch then sees those same messages as already
  // read — even though the user genuinely never opened them. To make "have
  // I actually looked at this" a fact only THIS client controls, we now
  // track it ourselves in localStorage: a timestamp per team/DM of the
  // last time the user opened it. Unread = messages newer than that
  // timestamp. This is refresh-proof and immune to whatever the server
  // does internally when messages are merely listed.
  const lastReadStorageKey = useCallback(
    (kind, id) => {
      const uid = user?.empId || user?.id || user?.email || "anon";
      return `chatLastRead:${activeCompanyId || "x"}:${uid}:${kind}:${id}`;
    },
    [activeCompanyId, user]
  );

  const getLastReadAt = useCallback(
    (kind, id) => {
      try {
        const v = window.localStorage.getItem(lastReadStorageKey(kind, id));
        return v ? new Date(v).getTime() : 0;
      } catch {
        return 0;
      }
    },
    [lastReadStorageKey]
  );

  const markLastRead = useCallback(
    (kind, id, when) => {
      if (!id) return;
      try {
        window.localStorage.setItem(lastReadStorageKey(kind, id), new Date(when || Date.now()).toISOString());
      } catch {
        // localStorage unavailable (private mode, etc) — badges just won't
        // persist across refresh in that case, nothing else breaks.
      }
    },
    [lastReadStorageKey]
  );

  const clearDmUnread = useCallback(
    (uid) => {
      if (!uid) return;
      markLastRead("dm", uid);
      setUnreadCounts((prev) => {
        if (!prev.dm[uid]) return prev;
        const next = { ...prev.dm };
        delete next[uid];
        return { ...prev, dm: next };
      });
    },
    [markLastRead]
  );

  const clearTeamUnread = useCallback(
    (teamId) => {
      if (!teamId) return;
      markLastRead("team", teamId);
      setUnreadCounts((prev) => {
        if (!prev.team[teamId]) return prev;
        const next = { ...prev.team };
        delete next[teamId];
        return { ...prev, team: next };
      });
    },
    [markLastRead]
  );

  const companyEmployees = useMemo(() => {
    if (!companies || !activeCompanyId) return [];
    const comp = companies.find((c) => c.id?.toString() === activeCompanyId?.toString());
    const list = comp?.employeeAccounts || [];
    const hrList = (comp?.hrAccounts || []).map((h) => ({
      id: h.empId || h.id || h.email,
      name: h.name || "HR Manager",
      email: h.email,
      role: "HR Manager",
      department: "HR"
    }));
    const all = [...hrList, ...list];
    return all.filter((emp) => {
      const isSameEmail = emp.email && user?.email && emp.email === user.email;
      const isSameId = emp.id && (emp.id === user?.id || emp.id === user?.empId);
      const isSameEmpId = emp.empId && (emp.empId === user?.id || emp.empId === user?.empId);
      return !isSameEmail && !isSameId && !isSameEmpId;
    });
  }, [companies, activeCompanyId, user]);

  const departments = useMemo(() => {
    const depts = new Set(["General", "Development", "Sales", "Operations", "Marketing"]);
    companyEmployees.forEach((emp) => emp.department && depts.add(emp.department));
    return Array.from(depts);
  }, [companyEmployees]);

  useEffect(() => {
    if (activeTab === "broadcast" && !targetGroup) {
      setTargetGroup(isAdminOrHR ? "General" : user?.department || "General");
    }
  }, [activeTab, user, targetGroup, isAdminOrHR]);

  // Auto-focus message input when a DM target is selected
  useEffect(() => {
    if (activeTab === "dm" && targetUser && messageInputRef.current) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
    }
  }, [activeTab, targetUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const authedFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    return data;
  }, []);

  const fetchTeams = useCallback(async () => {
    if (!activeCompanyId || !currentUserId) return;
    try {
      const data = await authedFetch(`/teams?companyId=${activeCompanyId}&userId=${currentUserId}`);
      // dedupeById: server can return the same team more than once (e.g. a
      // query that OR-matches the current user as both creator AND member);
      // collapse those down before they ever reach state.
      setTeams(dedupeById(normalizeIds(data)));
    } catch (err) {
      console.error("Error loading teams:", err);
    } finally {
      // Marks "we have heard back from the server about teams" — used to
      // gate fetchUnreadCounts below so it never runs against a still-
      // empty `teams` array just because this fetch hasn't resolved yet.
      setTeamsLoaded(true);
    }
  }, [activeCompanyId, currentUserId, authedFetch]);

  // Reset the "loaded" flag the moment we start looking at a different
  // company (super-admin company switcher) so the unread-count fetch below
  // waits for THIS company's teams to arrive instead of reusing a stale
  // "loaded" flag from the previous company while teams=[] is momentarily
  // true for the new one.
  useEffect(() => {
    setTeamsLoaded(false);
  }, [activeCompanyId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  // FIX (unread badges disappear after refresh even though nothing was
  // read): the badges were only ever bumped by the live socket handler, so
  // they lived in React state alone — a page reload wiped them even for
  // chats that genuinely still had unread messages sitting on the server.
  // This pulls the real unread state from the server on load: for every
  // team and every coworker, fetch that channel's messages (same endpoint
  // `fetchMessages` already uses, but WITHOUT calling the "mark as read"
  // PATCH afterwards) and count messages that aren't mine and are newer
  // than the locally-stored "last opened this channel" timestamp — see the
  // localStorage note above for why we don't trust the server's `readBy`
  // for this anymore.
  const fetchUnreadCounts = useCallback(async () => {
    if (!activeCompanyId || !currentUserId) return;
    try {
      const countUnread = (msgs, sinceMs) =>
        msgs.filter((m) => !isMessageMine(m) && m.createdAt && new Date(m.createdAt).getTime() > sinceMs).length;

      const teamEntries = await Promise.all(
        teams.map(async (t) => {
          try {
            const params = new URLSearchParams({ companyId: activeCompanyId, channel: "team", viewerId: currentUserId, teamId: t._id });
            const data = await authedFetch(`/chat/messages?${params.toString()}`);
            return [t._id, countUnread(normalizeIds(data), getLastReadAt("team", t._id))];
          } catch {
            return [t._id, 0];
          }
        })
      );

      const dmEntries = await Promise.all(
        companyEmployees.map(async (emp) => {
          const uid = emp.empId || emp.id || emp.email;
          try {
            const params = new URLSearchParams({
              companyId: activeCompanyId,
              channel: "dm",
              viewerId: currentUserId,
              senderId: currentUserId,
              receiverId: uid
            });
            const data = await authedFetch(`/chat/messages?${params.toString()}`);
            return [uid, countUnread(normalizeIds(data), getLastReadAt("dm", uid))];
          } catch {
            return [uid, 0];
          }
        })
      );

      setUnreadCounts({
        team: Object.fromEntries(teamEntries.filter(([, count]) => count > 0)),
        dm: Object.fromEntries(dmEntries.filter(([, count]) => count > 0))
      });
    } catch (err) {
      console.error("Error loading unread counts:", err);
    }
  }, [activeCompanyId, currentUserId, teams, companyEmployees, authedFetch, isMessageMine, getLastReadAt]);

  useEffect(() => {
    if (!activeCompanyId || !currentUserId) return;
    // Wait until we've actually heard back from the server about teams
    // (not just until the array happens to be non-empty) — otherwise this
    // can fire while `teams` is still its initial empty array, permanently
    // recording "already fetched for this company" with zero teams checked.
    if (!teamsLoaded) return;
    if (unreadFetchedForCompany.current === activeCompanyId) return;
    unreadFetchedForCompany.current = activeCompanyId;
    fetchUnreadCounts();
  }, [activeCompanyId, currentUserId, teamsLoaded, teams, companyEmployees, fetchUnreadCounts]);

  const handleCreateTeam = async ({ name, description, members }) => {
    // FIX (team created once, shows twice / survives refresh): unlike
    // sendMessage, createTeam previously had no protection against the
    // exact same request firing twice (double-click before the button's
    // `disabled` state re-renders, a network retry, etc). Each fire created
    // a genuinely separate document in MongoDB — not a display bug, two
    // real rows. clientTeamId lets the server treat a repeat of the same
    // client-generated id as a no-op and hand back the original team
    // instead of creating a duplicate, exactly like clientMessageId does
    // for messages.
    const clientTeamId =
      (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `ctid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const team = await authedFetch("/teams", {
        method: "POST",
        body: JSON.stringify({
          companyId: activeCompanyId,
          name,
          description,
          clientTeamId,
          createdBy: currentUserId,
          createdByAltIds: [user?.empId, user?.id, user?.email].filter(Boolean),
          creatorProfile: {
            name: user.name,
            email: user.email,
            role: user.type === "company" ? "Company Admin" : user.type === "hr" ? "HR Manager" : user.role,
            department: user.department,
            avatar: user.profileImage
          },
          members: members.map((m) => ({
            ...m,
            userId: m.empId || m.id || m.email,
            altIds: [m.empId, m.id, m.email].filter(Boolean)
          }))
        })
      });
      const normalized = normalizeId(team);
      // Optimistic add, deduped in case a "team-updated" socket echo (or a
      // background fetchTeams) lands with the same _id around the same time.
      setTeams((prev) => dedupeById([normalized, ...prev]));
      setShowCreateTeam(false);
      setActiveTab("team");
      setActiveTeamId(normalized._id);
      setTargetUser(null);
      // Reconcile with the server shortly after, so if the backend's own
      // query is what produced a duplicate/inconsistent list, we self-heal
      // to whatever the server considers the truth rather than staying on
      // a stale optimistic guess.
      fetchTeams();
    } catch (err) {
      console.error("Failed to create team:", err);
      const notMounted = /404/.test(err.message || "");
      alert(
        notMounted
          ? "Team creation failed: the server returned 404 for /api/teams. Your backend needs `app.use('/api/teams', teamRoutes)` added to server.js — this route isn't wired up yet."
          : err.message || "Failed to create team"
      );
    }
  };

  const handleEditTeam = async (updates) => {
    try {
      const team = await authedFetch(`/teams/${activeTeamId}`, {
        method: "PATCH",
        body: JSON.stringify({ userId: currentUserId, ...updates })
      });
      const normalized = normalizeId(team);
      setTeams((prev) => dedupeById(prev.map((t) => (t._id === normalized._id ? normalized : t))));
    } catch (err) {
      alert(err.message || "Failed to update team");
    }
  };

  const handleAddTeamMembers = async (members) => {
    try {
      const team = await authedFetch(`/teams/${activeTeamId}/members`, {
        method: "POST",
        body: JSON.stringify({
          userId: currentUserId,
          members: members.map((m) => ({
            userId: m.empId || m.id || m.email,
            altIds: [m.empId, m.id, m.email].filter(Boolean),
            name: m.name,
            email: m.email,
            role: m.role,
            department: m.department,
            avatar: m.profileImage
          }))
        })
      });
      const normalized = normalizeId(team);
      setTeams((prev) => dedupeById(prev.map((t) => (t._id === normalized._id ? normalized : t))));
    } catch (err) {
      alert(err.message || "Failed to add members");
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    try {
      const result = await authedFetch(`/teams/${activeTeamId}/members/${memberId}`, {
        method: "DELETE",
        body: JSON.stringify({ userId: currentUserId })
      });
      if (result.deleted) {
        setTeams((prev) => prev.filter((t) => t._id !== activeTeamId));
        setActiveTeamId(null);
        setShowTeamSettings(false);
      } else {
        const normalized = normalizeId(result);
        setTeams((prev) => dedupeById(prev.map((t) => (t._id === normalized._id ? normalized : t))));
      }
    } catch (err) {
      alert(err.message || "Failed to remove member");
    }
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm("Leave this team?")) return;
    await handleRemoveTeamMember(currentUserId);
    setActiveTab("company");
    setShowTeamSettings(false);
  };

  const handleDeleteTeam = async () => {
    if (!window.confirm("Delete this team for everyone? This cannot be undone.")) return;
    try {
      await authedFetch(`/teams/${activeTeamId}`, {
        method: "DELETE",
        body: JSON.stringify({ userId: currentUserId })
      });
      setTeams((prev) => prev.filter((t) => t._id !== activeTeamId));
      setActiveTeamId(null);
      setShowTeamSettings(false);
      setActiveTab("company");
    } catch (err) {
      alert(err.message || "Failed to delete team");
    }
  };

  const fetchMessages = useCallback(async () => {
    if (!user || !activeCompanyId) return;

    try {
      const params = new URLSearchParams();
      params.append("companyId", activeCompanyId);
      params.append("channel", activeTab);
      params.append("viewerId", currentUserId);

      if (activeTab === "broadcast") {
        const group = isAdminOrHR ? targetGroup || "General" : user?.department || "General";
        params.append("targetGroup", group);
      } else if (activeTab === "team") {
        if (!activeTeamId) {
          setMessages([]);
          return;
        }
        params.append("teamId", activeTeamId);
      } else if (activeTab === "dm") {
        if (!targetUser) {
          setMessages([]);
          return;
        }
        params.append("senderId", currentUserId);
        params.append("receiverId", targetUser.empId || targetUser.id || targetUser.email);
      }

      const data = await authedFetch(`/chat/messages?${params.toString()}`);
      setMessages(normalizeIds(data));

      // This channel is genuinely open in front of the user right now —
      // record it as read locally too (see the localStorage note above),
      // not just via the server PATCH below.
      if (activeTab === "team" && activeTeamId) {
        markLastRead("team", activeTeamId);
      } else if (activeTab === "dm" && targetUser) {
        markLastRead("dm", targetUser.empId || targetUser.id || targetUser.email);
      }

      await authedFetch("/chat/messages/read", {
        method: "PATCH",
        body: JSON.stringify({
          companyId: activeCompanyId,
          channel: activeTab,
          targetGroup: activeTab === "broadcast" ? (isAdminOrHR ? targetGroup || "General" : user?.department || "General") : undefined,
          teamId: activeTab === "team" ? activeTeamId : undefined,
          receiverId: activeTab === "dm" ? targetUser?.empId || targetUser?.id || targetUser?.email : undefined,
          userId: currentUserId
        })
      });
    } catch (err) {
      console.error("Error loading chat messages:", err);
    }
  }, [user, activeCompanyId, activeTab, targetGroup, activeTeamId, targetUser, currentUserId, isAdminOrHR, authedFetch, markLastRead]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (setChatUnreadCount) setChatUnreadCount(0);
  }, [activeTab, setChatUnreadCount]);

  const upsertMessage = useCallback((incoming) => {
    setMessages((prev) => {
      if (incoming._id && prev.some((m) => !m.isTemp && String(m._id) === String(incoming._id))) {
        return prev;
      }

      let tempIndex = -1;
      if (incoming.clientMessageId) {
        tempIndex = prev.findIndex((m) => m.isTemp && m.clientMessageId === incoming.clientMessageId);
      }
      if (tempIndex === -1) {
        tempIndex = prev.findIndex(
          (m) => m.isTemp && m.senderId === incoming.senderId && m.content === incoming.content && m.channel === incoming.channel
        );
      }

      if (tempIndex !== -1) {
        const next = [...prev];
        next[tempIndex] = incoming;
        return next;
      }
      return [...prev, incoming];
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    // FIX (Mohan never receives Raj's messages): match using full id
    // candidate sets on both sides instead of one collapsed id per person —
    // see the `myIds` / `candidateIds` comments above for why the old
    // single-id comparison could silently fail between two different
    // client-side id resolutions of the same person.
    const belongsToActiveContext = (msg) => {
      const senderIds = candidateIds({ id: msg.senderId });
      (msg.senderCandidates || []).forEach((id) => id != null && senderIds.add(String(id)));
      const receiverIds = candidateIds({ id: msg.receiverId });
      (msg.receiverCandidates || []).forEach((id) => id != null && receiverIds.add(String(id)));

      if (msg.channel === "dm") {
        if (activeTab !== "dm" || !targetUser) return false;
        const partnerIds = candidateIds(targetUser);
        const fromMeToPartner = setsIntersect(myIds, senderIds) && setsIntersect(partnerIds, receiverIds);
        const fromPartnerToMe = setsIntersect(partnerIds, senderIds) && setsIntersect(myIds, receiverIds);
        return fromMeToPartner || fromPartnerToMe;
      }
      if (msg.channel === "team") {
        return activeTab === "team" && msg.teamId === activeTeamId;
      }
      if (msg.channel === "broadcast") {
        const group = isAdminOrHR ? targetGroup || "General" : user?.department || "General";
        return activeTab === "broadcast" && msg.targetGroup === group;
      }
      return activeTab === msg.channel;
    };

    // Figure out which sidebar DM row (by the same uid used to key those
    // rows: empId || id || email) a message's sender corresponds to, so an
    // unread badge can be attached to the right person even though the
    // socket payload's senderId might not literally equal that uid.
    const resolveDmPartnerUid = (msg) => {
      const senderIds = candidateIds({ id: msg.senderId });
      (msg.senderCandidates || []).forEach((id) => id != null && senderIds.add(String(id)));
      const match = companyEmployees.find((c) => setsIntersect(candidateIds(c), senderIds));
      return match ? match.empId || match.id || match.email : msg.senderId;
    };

    const handleNewMessage = (rawMsg) => {
      const msg = normalizeId(rawMsg);
      const mine = isMessageMine(msg);
      const isActiveContext = belongsToActiveContext(msg);

      if (!mine && msg._id) {
        authedFetch(`/chat/messages/${msg._id}/delivered`, {
          method: "POST",
          body: JSON.stringify({ userId: currentUserId })
        }).catch(() => {});
      }

      if (isActiveContext) {
        upsertMessage(msg);
        if (!mine && msg._id) {
          authedFetch("/chat/messages/read", {
            method: "PATCH",
            body: JSON.stringify({
              companyId: activeCompanyId,
              channel: activeTab,
              targetGroup: activeTab === "broadcast" ? (isAdminOrHR ? targetGroup || "General" : user?.department || "General") : undefined,
              teamId: activeTab === "team" ? activeTeamId : undefined,
              receiverId: activeTab === "dm" ? targetUser?.empId || targetUser?.id || targetUser?.email : undefined,
              userId: currentUserId
            })
          }).catch(() => {});
        }
      } else if (!mine) {
        // Message is for a team/DM the user isn't currently looking at —
        // bump the little unread badge next to that name in the sidebar.
        if (msg.channel === "team" && msg.teamId) {
          setUnreadCounts((prev) => ({
            ...prev,
            team: { ...prev.team, [msg.teamId]: (prev.team[msg.teamId] || 0) + 1 }
          }));
        } else if (msg.channel === "dm") {
          const uid = resolveDmPartnerUid(msg);
          if (uid) {
            setUnreadCounts((prev) => ({
              ...prev,
              dm: { ...prev.dm, [uid]: (prev.dm[uid] || 0) + 1 }
            }));
          }
        }
      }
    };

    const handleDelivered = ({ messageIds, by }) => {
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(String(m._id))
            ? { ...m, deliveredTo: [...new Set([...(m.deliveredTo || []), by])] }
            : m
        )
      );
    };

    const handleRead = ({ messageIds, by }) => {
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(String(m._id))
            ? { ...m, readBy: [...new Set([...(m.readBy || []), by])], deliveredTo: [...new Set([...(m.deliveredTo || []), by])] }
            : m
        )
      );
    };

    const handleDeleted = ({ id }) => {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    };

    const handleTeamUpdated = ({ type, team: rawTeam, teamId }) => {
      if (type === "deleted") {
        setTeams((prev) => prev.filter((t) => t._id !== teamId));
        if (activeTeamId === teamId) {
          setActiveTeamId(null);
          setActiveTab("company");
        }
        return;
      }
      const team = normalizeId(rawTeam);
      setTeams((prev) => {
        const exists = prev.some((t) => t._id === team._id);
        const next = exists ? prev.map((t) => (t._id === team._id ? team : t)) : [team, ...prev];
        return dedupeById(next);
      });
    };

    socket.on("new-chat-message", handleNewMessage);
    socket.on("messages-delivered", handleDelivered);
    socket.on("messages-read", handleRead);
    socket.on("message-deleted", handleDeleted);
    socket.on("team-updated", handleTeamUpdated);

    return () => {
      socket.off("new-chat-message", handleNewMessage);
      socket.off("messages-delivered", handleDelivered);
      socket.off("messages-read", handleRead);
      socket.off("message-deleted", handleDeleted);
      socket.off("team-updated", handleTeamUpdated);
    };
  }, [socket, activeTab, targetGroup, activeTeamId, targetUser, currentUserId, isAdminOrHR, activeCompanyId, user, authedFetch, upsertMessage, myIds, isMessageMine, companyEmployees]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user || !activeCompanyId || sending) return;
    if (activeTab === "team" && !activeTeamId) return;
    if (activeTab === "dm" && !targetUser) return;

    const content = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const senderName = user.name || "Employee";
    const senderRole = user.type === "company" ? "Company Admin" : user.type === "hr" ? "HR Manager" : user.role || "Employee";

    const clientMessageId =
      (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `cid-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const payload = {
      companyId: activeCompanyId,
      channel: activeTab,
      teamId: activeTab === "team" ? activeTeamId : undefined,
      targetGroup: activeTab === "broadcast" ? targetGroup || user.department || "General" : "General",
      senderId: currentUserId,
      senderName,
      senderRole,
      senderAvatar: user.profileImage || "",
      // senderCandidates: every id I could be known by. Sent alongside
      // receiverCandidates so the RECEIVING client can match "is this
      // message from/to me" against my full identity set instead of a
      // single id that might not match what my own client resolves itself
      // as — this is the core fix for messages never showing up on the
      // other side.
      senderCandidates: [user?.empId, user?.id, user?.email].filter(Boolean),
      content,
      clientMessageId,
      receiverId: activeTab === "dm" ? targetUser?.empId || targetUser?.id || targetUser?.email : "",
      receiverName: activeTab === "dm" ? targetUser?.name || "User" : "",
      receiverCandidates: activeTab === "dm" ? [targetUser?.empId, targetUser?.id, targetUser?.email].filter(Boolean) : undefined
    };

    const tempId = "temp-" + Date.now();
    setMessages((prev) => [
      ...prev,
      { ...payload, _id: tempId, isTemp: true, createdAt: new Date().toISOString(), deliveredTo: [], readBy: [] }
    ]);

    try {
      const saved = await authedFetch("/chat/messages", { method: "POST", body: JSON.stringify(payload) });
      upsertMessage(normalizeId(saved));
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      alert(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return companyEmployees.filter((emp) => {
      if (String(emp.id) === String(user.id) || String(emp.empId) === String(user.empId) || (emp.email && user.email && emp.email === user.email)) {
        return false;
      }
      if (!searchUserQuery) return true;
      const q = searchUserQuery.toLowerCase();
      return (
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q))
      );
    });
  }, [companyEmployees, user, searchUserQuery]);

  const filteredTeams = useMemo(() => {
    if (!teamSearchQuery) return teams;
    const q = teamSearchQuery.toLowerCase();
    return teams.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [teams, teamSearchQuery]);

  const getChannelTitle = () => {
    switch (activeTab) {
      case "company": return "Company General";
      case "hr": return "HR & Support";
      case "broadcast": return `Announcements · ${targetGroup || user?.department || "General"}`;
      case "team": return activeTeam ? activeTeam.name : "Select a team";
      case "dm": return targetUser ? targetUser.name : "Direct Messages";
      default: return "Chat";
    }
  };

  const getChannelDescription = () => {
    switch (activeTab) {
      case "company": return "All team members in the company";
      case "hr": return "HR queries, support tickets, and private assistance";
      case "broadcast": return "Official announcements (read-only for employees)";
      case "team": return activeTeam ? `${(activeTeam.members || []).length} members` : "Create or pick a team to start chatting";
      case "dm": return targetUser ? targetUser.email || "" : "Select a colleague to start a 1-on-1 message";
      default: return "";
    }
  };

  const isTeamAdmin = activeTeam ? activeTeam.createdBy === currentUserId || (activeTeam.admins || []).includes(currentUserId) : false;

  // COMPANY FEATURE TOGGLE: chatEnabled (Admin Settings -> Application
  // Settings). SideBar.jsx already hides the "Chat" nav link when this is
  // OFF, but this guard blocks direct URL access (e.g. someone typing
  // /chat straight into the address bar) too. All hooks above have
  // already run, so this early return is safe (Rules of Hooks).
  const chatModuleEnabled = companies.find((c) => String(c.id) === String(user?.companyId))?.featureSettings?.chatEnabled !== false;
  if (!chatModuleEnabled) {
    return (
      <div className="container-fluid py-5 text-center" style={{ color: "var(--text-main)" }}>
        <i className="bi bi-chat-dots fs-1 text-muted d-block mb-3"></i>
        <h4>Chat is not enabled for your company</h4>
        <p className="text-muted">Please contact your Company Admin if you believe this is a mistake.</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ color: "var(--text-main)", height: "calc(100vh - 85px)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-shrink-0">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center text-white"
            style={{ width: "42px", height: "42px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <i className="bi bi-chat-dots-fill fs-5"></i>
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ color: "var(--text-main)" }}>Communication Hub</h4>
            <small className="text-muted">Team messaging, channels, and direct chats</small>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted fw-semibold">Company:</span>
            <select
              className="form-select form-select-sm"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)", borderColor: "var(--border-color)", minWidth: "180px" }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div
        className="card border-0 shadow-sm flex-grow-1 overflow-hidden"
        style={{ backgroundColor: "var(--bg-card)", borderRadius: "18px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "row", minHeight: 0 }}
      >
        {/* Left Sidebar */}
        <div style={{ width: "290px", borderRight: "1px solid var(--border-color)", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-main)", flexShrink: 0, minHeight: 0, overflowY: "auto" }}>

          {/* Profile moved to the top, name shifted right and down */}
          <div className="p-3 border-bottom d-flex align-items-start gap-2 flex-shrink-0" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-card)" }}>
            <div className="mt-2">
              <Avatar name={user?.name} size={34} bg="#10b981" />
            </div>
            <div className="min-w-0 flex-grow-1 mt-1 ms-2">
              <div className="text-truncate fw-bold small" style={{ lineHeight: 1.2 }}>{user?.name}</div>
              <span className="badge bg-white bg-opacity-20 text-success" style={{ fontSize: "0.65rem" }}>Online</span>
            </div>
          </div>

          <div className="p-2 d-flex flex-column gap-1 border-bottom flex-shrink-0" style={{ borderColor: "var(--border-color)" }}>
            {[
              { key: "company", icon: "bi-buildings", label: "Company General" },
              { key: "hr", icon: "bi-shield-check", label: "HR & Support" }
            ].map((ch) => (
              <button
                key={ch.key}
                type="button"
                className="btn btn-sm text-start d-flex align-items-center gap-2 p-2 rounded-3 border-0"
                onClick={() => { setActiveTab(ch.key); setTargetUser(null); setActiveTeamId(null); }}
                style={{
                  backgroundColor: activeTab === ch.key ? "#4f46e5" : "transparent",
                  color: activeTab === ch.key ? "#ffffff" : "var(--text-main)",
                  fontWeight: activeTab === ch.key ? 600 : 500
                }}
              >
                <i className={`bi ${ch.icon}`}></i>
                <span>{ch.label}</span>
              </button>
            ))}

            <button
              type="button"
              className="btn btn-sm text-start d-flex align-items-center justify-content-between p-2 rounded-3 border-0"
              onClick={() => { setActiveTab("broadcast"); setTargetUser(null); setActiveTeamId(null); }}
              style={{
                backgroundColor: activeTab === "broadcast" ? "#4f46e5" : "transparent",
                color: activeTab === "broadcast" ? "#ffffff" : "var(--text-main)",
                fontWeight: activeTab === "broadcast" ? 600 : 500
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-megaphone"></i>
                <span>Announcements</span>
              </div>
              <span className="badge bg-secondary bg-opacity-50" style={{ fontSize: "0.65rem" }}>Read Only</span>
            </button>
          </div>

          {/* Broadcast Department Selector (Strictly hidden when activeTab !== "broadcast") */}
          {activeTab === "broadcast" && isAdminOrHR && (
            <div className="p-2 border-bottom flex-shrink-0" style={{ borderColor: "var(--border-color)" }}>
              <label className="small text-muted fw-bold mb-1" style={{ fontSize: "0.72rem" }}>Post to department:</label>
              <select
                className="form-select form-select-sm"
                value={targetGroup}
                onChange={(e) => setTargetGroup(e.target.value)}
                style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Teams Section */}
          <button
            type="button"
            className="py-0 px-2 border-bottom d-flex justify-content-between align-items-center w-100 border-0 bg-transparent flex-shrink-0"
            style={{ borderColor: "var(--border-color)" }}
            onClick={() => setTeamsExpanded((v) => !v)}
          >
            <span className="d-flex align-items-center gap-2">
              <i className={`bi ${teamsExpanded ? "bi-chevron-down" : "bi-chevron-right"}`} style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}></i>
              <span className="text-uppercase fw-bold text-muted" style={{ fontSize: "0.72rem", letterSpacing: "0.08em" }}>
                Teams
              </span>
              {teams.length > 0 && (
                <span className="badge bg-primary text-white" style={{ fontSize: "0.68rem", fontWeight: 600, padding: "0.35em 0.5em" }}>{teams.length}</span>
              )}
            </span>
            <div className="d-flex align-items-center gap-2">
              <span
                role="button"
                className="btn btn-sm btn-link p-0 text-muted"
                onClick={(e) => { e.stopPropagation(); setShowTeamSearch(!showTeamSearch); if (!teamsExpanded) setTeamsExpanded(true); }}
                title="Search teams"
              >
                <i className="bi bi-search fs-6"></i>
              </span>
              <span
                role="button"
                className="btn btn-sm btn-link p-0 text-primary"
                onClick={(e) => { e.stopPropagation(); setShowCreateTeam(true); }}
                title="Create team"
              >
                <i className="bi bi-plus-circle-fill fs-5"></i>
              </span>
            </div>
          </button>

          {teamsExpanded && showTeamSearch && (
            <div className="p-2 border-bottom flex-shrink-0" style={{ borderColor: "var(--border-color)" }}>
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search teams..."
                  value={teamSearchQuery}
                  onChange={(e) => setTeamSearchQuery(e.target.value)}
                  autoFocus
                  style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
                />
              </div>
            </div>
          )}

          {teamsExpanded && (
            <div
              className="px-2 pb-2 d-flex flex-column gap-1 border-bottom"
              style={{ borderColor: "var(--border-color)", maxHeight: "240px", minHeight: filteredTeams.length ? "56px" : "auto", overflowY: "auto", flexShrink: 0 }}
            >
              {filteredTeams.length > 0 ? (
                filteredTeams.map((t) => {
                  const isSelected = activeTab === "team" && activeTeamId === t._id;
                  const unread = unreadCounts.team[t._id] || 0;
                  return (
                    <button
                      key={t._id}
                      type="button"
                      className="btn btn-sm text-start d-flex align-items-center gap-2 p-2 rounded-3 border-0"
                      onClick={() => { setActiveTab("team"); setActiveTeamId(t._id); setTargetUser(null); clearTeamUnread(t._id); }}
                      style={{ backgroundColor: isSelected ? "#4f46e5" : "transparent", color: isSelected ? "#ffffff" : "var(--text-main)" }}
                    >
                      <Avatar name={t.name} size={28} bg={t.avatarColor} />
                      <div className="min-w-0 flex-grow-1">
                        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                          <span className="text-truncate fw-semibold" style={{ fontSize: "0.85rem", minWidth: 0, flex: "1 1 auto" }}>{t.name}</span>
                          {!isSelected && <UnreadBadge count={unread} />}
                        </div>
                        <small className="text-truncate d-block" style={{ fontSize: "0.68rem", opacity: 0.8 }}>{t.members.length} members</small>
                      </div>
                    </button>
                  );
                })
              ) : teams.length === 0 ? null : (
                <div className="text-center py-2 text-muted small">No teams match your search.</div>
              )}
            </div>
          )}

          {/* Direct Messages Section */}
          <div className="py-0 px-2 border-bottom d-flex flex-column gap-1 flex-shrink-0" style={{ borderColor: "var(--border-color)" }}>
            <div className="d-flex justify-content-between align-items-center w-100">
              <button
                type="button"
                className="d-flex align-items-center gap-2 border-0 bg-transparent p-0"
                onClick={() => setDmExpanded((v) => !v)}
              >
                <i className={`bi ${dmExpanded ? "bi-chevron-down" : "bi-chevron-right"}`} style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}></i>
                <span className="text-uppercase fw-bold text-muted" style={{ fontSize: "0.72rem", letterSpacing: "0.08em" }}>
                  Direct Messages
                </span>
              </button>

              <div className="d-flex align-items-center gap-2">
                <span
                  role="button"
                  className="btn btn-sm btn-link p-0 text-muted"
                  onClick={() => { setShowDmSearch(!showDmSearch); if (!dmExpanded) setDmExpanded(true); }}
                  title="Search coworkers"
                >
                  <i className="bi bi-search fs-6"></i>
                </span>
                <span className="badge bg-primary text-white" style={{ fontSize: "0.7rem", fontWeight: 600, padding: "0.35em 0.6em" }}>
                  {filteredUsers.length}
                </span>
              </div>
            </div>

            {dmExpanded && showDmSearch && (
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search coworker..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  autoFocus
                  style={{ backgroundColor: "var(--bg-card)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
                />
              </div>
            )}
          </div>

          {/* Dropdown body now ONLY contains employee names */}
          {dmExpanded && (
            <div className="px-0 pb-2 pt-1 flex-grow-1 overflow-y-auto d-flex flex-column gap-1" style={{ minHeight: "120px" }}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const uid = u.empId || u.id || u.email;
                  const isSelected = activeTab === "dm" && (targetUser?.empId === uid || targetUser?.id === uid || targetUser?.email === u.email);
                  const unread = unreadCounts.dm[uid] || 0;
                  return (
                    <button
                      key={uid}
                      type="button"
                      className="btn btn-sm text-start d-flex align-items-center gap-2 p-2 rounded-3 border-0"
                      onClick={() => { setActiveTab("dm"); setTargetUser(u); setActiveTeamId(null); clearDmUnread(uid); }}
                      style={{ backgroundColor: isSelected ? "#4f46e5" : "transparent", color: isSelected ? "#ffffff" : "var(--text-main)" }}
                    >
                      <Avatar name={u.name || u.email} img={u.profileImage} size={30} />
                      <div className="min-w-0 flex-grow-1">
                        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                          <span className="text-truncate fw-semibold" style={{ fontSize: "0.85rem", minWidth: 0, flex: "1 1 auto" }}>{u.name || u.email}</span>
                          {!isSelected && <UnreadBadge count={unread} />}
                        </div>
                        <small className="text-truncate d-block" style={{ fontSize: "0.7rem", opacity: 0.8 }}>{u.role || u.department || "Coworker"}</small>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-4 text-muted small">No coworkers found.</div>
              )}
            </div>
          )}
        </div>

        {/* Right Pane */}
        <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, height: "100%" }}>
          {/*
            FIX (header showing team/DM name + the three-dot menu goes
            blank): every color here previously relied on a CSS custom
            property (var(--text-main), var(--border-color)) with NO
            fallback. If the active theme/stylesheet doesn't define that
            variable, `color: var(--text-main)` doesn't just do nothing —
            it makes the declaration invalid, so the browser falls back to
            its OWN default text color (black) on whatever background is
            underneath. On a dark theme that's black-on-navy: the text and
            icon are still there in the DOM, just invisible. Every var()
            below now has an explicit light-on-dark fallback so the header
            can't disappear regardless of which theme is active. The
            three-dot button also no longer depends on Bootstrap's
            `btn-light` class alone — it has explicit background/color so a
            theme that restyles `.btn-light` can't hide it either.

            FIX (header scrolls out of view / gets pushed off the top):
            this pane, its parent `.card`, and the parent container above
            it were all flex containers without `minHeight: 0`. A flex
            item's automatic minimum height defaults to the height of its
            content, NOT the space actually available — so once the
            message list grew past the viewport, this whole column (header
            included) expanded past the card instead of staying put and
            letting only the messages list scroll. `minHeight: 0` here (and
            up the chain) plus `flexShrink: 0` on the header/footer below
            forces the browser to respect the parent's real height and
            confine scrolling to the messages list only.
          */}
          <div
            className="p-3 border-bottom d-flex justify-content-between align-items-center flex-shrink-0"
            style={{ borderColor: "var(--border-color, #2d3348)", backgroundColor: "var(--bg-card, #12172b)" }}
          >
            <div className="d-flex align-items-center gap-2">
              {activeTab === "team" && activeTeam && <Avatar name={activeTeam.name} size={36} bg={activeTeam.avatarColor} />}
              {activeTab === "dm" && targetUser && <Avatar name={targetUser.name} img={targetUser.profileImage} size={36} />}
              <div>
                <h6 className="mb-0 fw-bold" style={{ color: "var(--text-main, #f1f5f9)" }}>{getChannelTitle()}</h6>
                <small style={{ fontSize: "0.78rem", color: "var(--text-muted, #94a3b8)" }}>{getChannelDescription()}</small>
              </div>
            </div>
            {activeTab === "team" && activeTeam && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setShowTeamSettings(true)}
                title="Team settings — edit name, add/remove members, delete team"
                style={{ backgroundColor: "var(--bg-main, #1a2035)", color: "var(--text-main, #f1f5f9)", border: "1px solid var(--border-color, #2d3348)" }}
              >
                <i className="bi bi-three-dots"></i>
              </button>
            )}
          </div>

          <div className="p-4 flex-grow-1 overflow-y-auto d-flex flex-column gap-3" style={{ backgroundColor: "var(--bg-main)", minHeight: 0 }}>
            {activeTab === "team" && !activeTeamId ? (
              <div className="text-center my-auto py-5">
                <div className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center" style={{ width: "64px", height: "64px", backgroundColor: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                  <i className="bi bi-people fs-2"></i>
                </div>
                <h6 className="fw-bold" style={{ color: "var(--text-main)" }}>No team selected</h6>
                <p className="text-muted small mb-2">Pick a team on the left, or create a new one.</p>
                <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowCreateTeam(true)}>
                  <i className="bi bi-plus-lg me-1"></i> Create Team
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center my-auto py-5">
                <div className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center" style={{ width: "64px", height: "64px", backgroundColor: "rgba(99,102,241,0.12)", color: "#6366f1" }}>
                  <i className="bi bi-chat-heart fs-2"></i>
                </div>
                <h6 className="fw-bold" style={{ color: "var(--text-main)" }}>No messages yet</h6>
                <p className="text-muted small mb-0">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMine = isMessageMine(msg);
                return (
                  <div key={msg._id || index} className={`d-flex gap-2 ${isMine ? "justify-content-end" : "justify-content-start"}`}>
                    {!isMine && <Avatar name={msg.senderName} img={msg.senderAvatar} size={36} />}
                    <div style={{ maxWidth: "72%" }}>
                      {!isMine && (
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="fw-bold small" style={{ color: "var(--text-main)" }}>{msg.senderName}</span>
                          <span className="badge bg-secondary bg-opacity-25 text-muted" style={{ fontSize: "0.65rem" }}>{msg.senderRole}</span>
                        </div>
                      )}
                      <div
                        className="p-3 shadow-sm"
                        style={{
                          borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          backgroundColor: isMine ? "#4f46e5" : "var(--bg-card)",
                          color: isMine ? "#ffffff" : "var(--text-main)",
                          border: isMine ? "none" : "1px solid var(--border-color)",
                          fontSize: "0.9rem",
                          wordBreak: "break-word",
                          lineHeight: "1.45"
                        }}
                      >
                        {msg.content}
                      </div>
                      <div className={`d-flex align-items-center gap-1 mt-1 ${isMine ? "justify-content-end" : "justify-content-start"}`}>
                        <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </small>
                        {isMine && <MessageTicks message={msg} />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-top flex-shrink-0" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-color)" }}>
            {activeTab === "broadcast" && !isAdminOrHR ? (
              <div className="alert alert-secondary mb-0 py-2 text-center small">
                <i className="bi bi-lock-fill me-1"></i> Announcements channel is read-only. Only HR and Admins can post.
              </div>
            ) : activeTab === "dm" && !targetUser ? (
              <div className="alert alert-info mb-0 py-2 text-center small">
                <i className="bi bi-person-lines-fill me-1"></i> Please select a colleague from the left to start direct messaging.
              </div>
            ) : activeTab === "team" && !activeTeamId ? (
              <div className="alert alert-info mb-0 py-2 text-center small">
                <i className="bi bi-people me-1"></i> Select or create a team to start chatting.
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="d-flex align-items-center gap-2">
                <input
                  ref={messageInputRef}
                  type="text"
                  className="form-control py-2 px-3"
                  placeholder={
                    activeTab === "dm" && targetUser
                      ? `Message @${targetUser.name}...`
                      : activeTab === "team" && activeTeam
                      ? `Message #${activeTeam.name}...`
                      : activeTab === "broadcast"
                      ? "Post an official announcement..."
                      : "Type your message here..."
                  }
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  style={{ backgroundColor: "var(--bg-main)", color: "var(--text-main)", borderColor: "var(--border-color)", borderRadius: "12px" }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-1"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)", border: "none", borderRadius: "12px" }}
                >
                  <i className="bi bi-send-fill"></i>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <CreateTeamModal show={showCreateTeam} onClose={() => setShowCreateTeam(false)} candidates={companyEmployees} onCreate={handleCreateTeam} />

      {activeTeam && (
        <TeamSettingsModal
          show={showTeamSettings}
          onClose={() => setShowTeamSettings(false)}
          team={activeTeam}
          currentUserId={currentUserId}
          isAdmin={isTeamAdmin}
          candidates={companyEmployees}
          onEdit={handleEditTeam}
          onAddMembers={handleAddTeamMembers}
          onRemoveMember={handleRemoveTeamMember}
          onLeave={handleLeaveTeam}
          onDelete={handleDeleteTeam}
        />
      )}
    </div>
  );
};

export default Chat;