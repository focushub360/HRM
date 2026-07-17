import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { db } from "../firebase";
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";

const Chat = () => {
  const { user, companies } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("company"); // company, hr, broadcast, team, dm
  const [targetTeam, setTargetTeam] = useState("");
  const [targetUser, setTargetUser] = useState(null); // For DM
  const messagesEndRef = useRef(null);

  const isSuperAdmin = !user?.companyId || user?.role === 'admin';
  const isAdminOrHR = user?.type === "company" || user?.type === "hr" || isSuperAdmin;

  const [targetCompany, setTargetCompany] = useState(user?.companyId || "");

  // Initialize target company for super admin if needed
  useEffect(() => {
    if (isSuperAdmin && companies.length > 0 && !targetCompany) {
      setTargetCompany(companies[0].id);
    }
  }, [isSuperAdmin, companies, targetCompany]);

  const activeCompanyId = isSuperAdmin ? targetCompany : user?.companyId;

  // Get current company employees for DM list & Team list based on ACTIVE company
  const companyEmployees = useMemo(() => {
    if (!companies || !activeCompanyId) return [];
    // Ensure ID comparison is safe (string vs number)
    const comp = companies.find(c => c.id.toString() === activeCompanyId.toString());
    return comp?.employeeAccounts || [];
  }, [companies, activeCompanyId]);

  // Extract unique departments from the ACTIVE company employees
  const departments = useMemo(() => {
    const depts = new Set(["General"]);
    companyEmployees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts);
  }, [companyEmployees]);

  // Set default target team whenever tab or user changes
  useEffect(() => {
    if (activeTab === "team" && !targetTeam) {
      // If admin, default to General. If employee, force their dept.
      setTargetTeam(user?.department || "General");
    }
  }, [activeTab, user, targetTeam]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user || !activeCompanyId) return;

    let q;
    const messagesRef = collection(db, "messages");
    const companyIdStr = activeCompanyId.toString();

    // --- QUERY LOGIC ---
    // Note: REMOVED orderBy("createdAt") to avoid "Index Required" errors without console access.
    // We will sort client-side instead.
    if (activeTab === "company") {
      q = query(messagesRef, where("companyId", "==", companyIdStr), where("type", "==", "company"));

    } else if (activeTab === "hr") {
      q = query(messagesRef, where("companyId", "==", companyIdStr), where("type", "==", "hr"));

    } else if (activeTab === "broadcast") {
      // Announcements now scoped to Team ("under respective team")
      const actualTarget = isAdminOrHR ? (targetTeam || "General") : (user.department || "General");

      q = query(
        messagesRef,
        where("companyId", "==", companyIdStr),
        where("type", "==", "broadcast"),
        where("targetGroup", "==", actualTarget)
      );

    } else if (activeTab === "team") {
      // If Admin/HR, use targetTeam dropdown. If Employee, force their department.
      const actualTarget = isAdminOrHR ? (targetTeam || "General") : (user.department || "General");

      q = query(
        messagesRef,
        where("companyId", "==", companyIdStr),
        where("type", "==", "team"),
        where("targetGroup", "==", actualTarget)
      );
    } else if (activeTab === "dm") {
      if (!targetUser) {
        setMessages([]);
        return;
      }
      // DM Query: 'type' == 'dm' AND 'participants' contains my ID
      const myId = user.empId || user.id || user._id || ("admin_" + user.email);
      q = query(
        messagesRef,
        where("companyId", "==", companyIdStr),
        where("type", "==", "dm"),
        where("participants", "array-contains", myId)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Client-Side Filter for DM to show only conversation with selected user (extra safety)
      if (activeTab === "dm" && targetUser) {
        const targetId = targetUser.id || targetUser.empId || targetUser._id;
        if (targetId) {
          msgs = msgs.filter(m => m.participants.includes(targetId));
        }
      }

      // Filter out 'Company' (Admin) messages as requested
      // "set as msg only from hr and company team mates only" -> Remove 'role: company'
      msgs = msgs.filter(m => m.role !== 'company');

      // Client-Side Sort (Fix for Index Error)
      msgs.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t1 - t2;
      });

      setMessages(msgs);
    }, (error) => {
      console.error("Chat Error:", error);
    });

    return () => unsubscribe();
  }, [activeTab, user, targetTeam, targetUser, isAdminOrHR, activeCompanyId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !activeCompanyId) return;

    // Logic to ensure senderId is never undefined
    const safeSenderId = user.empId || user.id || user._id || ("admin_" + user.email);

    if (!safeSenderId) {
      console.error("Chat Error: User ID missing", user);
      alert("Unable to identify user. Please try logging out and back in.");
      return;
    }

    try {
      let payload = {
        text: newMessage,
        senderId: safeSenderId,
        senderName: user.name || "Unknown User",
        role: user.type,
        companyId: activeCompanyId.toString(),
        type: activeTab,
        createdAt: serverTimestamp(),
      };

      if (activeTab === "team" || activeTab === "broadcast") {
        payload.targetGroup = isAdminOrHR ? targetTeam : (user.department || "General");
      } else if (activeTab === "dm") {
        if (!targetUser) return;
        const safeTargetId = targetUser.id || targetUser.empId || targetUser._id;
        if (!safeTargetId) {
          alert("Cannot chat with this user: missing ID.");
          return;
        }
        payload.participants = [safeSenderId, safeTargetId];
        payload.targetGroup = "dm";
      }

      await addDoc(collection(db, "messages"), payload);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        alert("System Error: Firestore Index missing. Check console for links.");
      } else {
        alert("Failed to send message: " + error.message);
      }
    }
  };

  const canSend = () => {
    if (activeTab === "broadcast") return isAdminOrHR;
    if (activeTab === "dm" && !targetUser) return false;
    return true;
  };

  return (
    <div className="container-fluid py-4" style={{ height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
      <h2 className="mb-4" style={{ color: 'var(--text-main)' }}>💬 FE Communication Hub</h2>

      <div className="row flex-grow-1 g-3">
        {/* Sidebar */}
        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-header border-bottom py-3" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
              <h6 className="mb-0 fw-bold"><i className="bi bi-chat-dots-fill me-2 text-primary"></i>Channels</h6>
            </div>
            <div className="list-group list-group-flush" style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              {/* Standard Channels */}
              <button className={`list-group-item list-group-item-action ${activeTab === "company" ? "active" : ""}`} onClick={() => setActiveTab("company")}>
                <i className="bi bi-building me-2"></i> Company General
              </button>

              <button className={`list-group-item list-group-item-action ${activeTab === "hr" ? "active" : ""}`} onClick={() => setActiveTab("hr")}>
                <i className="bi bi-people-fill me-2"></i> HR & Support
              </button>

              <button className={`list-group-item list-group-item-action ${activeTab === "broadcast" ? "active" : ""}`} onClick={() => setActiveTab("broadcast")}>
                <i className="bi bi-megaphone-fill me-2"></i> Announcements
                {!isAdminOrHR && <span className="badge bg-secondary ms-2">Read Only</span>}
              </button>

              <button className={`list-group-item list-group-item-action ${activeTab === "team" ? "active" : ""}`} onClick={() => setActiveTab("team")}>
                <i className="bi bi-microsoft-teams me-2"></i> Team Chat
              </button>

              {/* Direct Messages Section */}
              <div className="list-group-item fw-bold text-muted small text-uppercase mt-2" style={{ backgroundColor: 'var(--bg-main)', borderLeft: 'none', borderRight: 'none' }}>
                Direct Messages
              </div>
              <button
                className={`list-group-item list-group-item-action ${activeTab === "dm" && !targetUser ? "active" : ""}`}
                onClick={() => { setActiveTab("dm"); setTargetUser(null); }}
              >
                <i className="bi bi-person-lines-fill me-2"></i> Select User
              </button>

              {/* Active DM display (if any) */}
              {activeTab === 'dm' && targetUser && (
                <button className="list-group-item list-group-item-action active border-start border-4 border-warning">
                  <div className="d-flex align-items-center">
                    <div className="ratio ratio-1x1 rounded-circle bg-white text-primary d-flex align-items-center justify-content-center me-2" style={{ width: '24px' }}>
                      {targetUser.name.charAt(0)}
                    </div>
                    <small className="text-truncate">{targetUser.name}</small>
                  </div>
                </button>
              )}
            </div>

            <div className="mt-auto p-3 border-top" style={{ backgroundColor: 'var(--bg-card)' }}>
              <small className="text-muted d-block text-center">
                Logged in as <strong>{user?.name}</strong> <br />
                <span className="badge bg-secondary">{user?.type?.toUpperCase()}</span>
                {isSuperAdmin && <div className="badge bg-warning text-dark mt-1">Super Admin</div>}
              </small>
            </div>
          </div>
        </div>

        {/* Chat Area - Or Selection Area */}
        <div className="col-md-9">
          <div className="card shadow-sm h-100">
            {/* Header */}
            <div className={`card-header text-white ${activeTab === 'broadcast' ? 'bg-danger' : activeTab === 'hr' ? 'bg-info' : 'bg-primary'}`}>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <h5 className="mb-0">
                    {activeTab === "company" && "🏢 Company General Chat"}
                    {activeTab === "hr" && "🤝 HR Support & Queries"}
                    {activeTab === "broadcast" && "📢 Admin Announcements"}
                    {activeTab === "team" && "👥 Team Chat"}
                    {activeTab === "dm" && (targetUser ? `💬 Chat with ${targetUser.name}` : "👤 Select a User")}
                  </h5>

                  {/* Super Admin Company Selector */}
                  {isSuperAdmin && (
                    <select
                      className="form-select form-select-sm bg-white text-dark border-0 fw-bold"
                      style={{ maxWidth: '220px' }}
                      value={targetCompany}
                      onChange={(e) => {
                        setTargetCompany(e.target.value);
                        setTargetUser(null); // Reset DM user when changing company
                      }}
                    >
                      {companies.map(c => <option key={c.id} value={c.id}>🏢 {c.name}</option>)}
                    </select>
                  )}

                  {/* Admin Team Selector - Enabled for Team AND Broadcast */}
                  {(activeTab === "team" || activeTab === "broadcast") && isAdminOrHR && (
                    <select
                      className="form-select form-select-sm bg-white text-dark border-0"
                      style={{ maxWidth: '200px' }}
                      value={targetTeam}
                      onChange={(e) => setTargetTeam(e.target.value)}
                    >
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}
                </div>
                <span className="badge bg-light text-dark">Live</span>
              </div>
            </div>

            {/* DM Selection View */}
            {activeTab === "dm" && !targetUser ? (
              <div className="card-body p-4" style={{ overflowY: 'auto' }}>
                <h5 className="mb-3 text-muted">Select a colleague to message:</h5>
                <div className="list-group">
                  {companyEmployees.filter(e => {
                    const myId = user.empId || user.id || user._id || ("admin_" + user.email);
                    const theirId = e.id || e.empId || e._id;
                    return theirId !== myId;
                  }).map(emp => (
                    <button
                      key={emp.id}
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                      onClick={() => setTargetUser(emp)}
                    >
                      <div>
                        <span className="fw-bold">{emp.name}</span> <br />
                        <small className="text-muted">{emp.designation} • {emp.department}</small>
                      </div>
                      <i className="bi bi-chat-dots-fill text-primary"></i>
                    </button>
                  ))}
                  {companyEmployees.length === 0 && <p className="text-muted">No other employees found in this company.</p>}
                </div>
              </div>
            ) : (
              /* Actual Chat View */
              <>
                <div className="card-body" style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "60vh", backgroundColor: 'var(--bg-sidebar-hover)' }}>
                  {messages.map((msg) => {
                    // Check if message is mine
                    const myId = user.empId || user.id || user._id || ("admin_" + user.email);
                    const isMe = msg.senderId === myId;
                    const isAdmin = (msg.role === 'company' || msg.role === 'hr') && activeTab !== 'dm'; // In DM, roles matter less

                    return (
                      <div key={msg.id} className={`d-flex ${isMe ? "justify-content-end" : "justify-content-start"}`}>
                        <div className={`p-3 rounded shadow-sm ${isMe ? "bg-primary text-white" : "border"}`} style={{ maxWidth: "75%", minWidth: "30%", backgroundColor: isMe ? '' : 'var(--bg-card)', color: isMe ? 'white' : 'var(--text-main)' }}>
                          <div className="d-flex justify-content-between mb-1">
                            <small className={`fw-bold ${isMe ? "text-light" : isAdmin ? "text-danger" : "text-primary"}`} style={{ fontSize: '0.8rem' }}>
                              {msg.senderName} {isAdmin && !isMe && " (Admin)"}
                            </small>
                            <small className={isMe ? "text-white-50" : "text-muted"} style={{ fontSize: '0.7rem' }}>
                              {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </small>
                          </div>
                          <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                  {messages.length === 0 && (
                    <div className="text-center text-muted my-auto">
                      <i className="bi bi-chat-square-text fs-1 opacity-25"></i>
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                {canSend() ? (
                  <div className="card-footer" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <form onSubmit={handleSendMessage} className="d-flex gap-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Message ${activeTab === 'dm' ? targetUser?.name : '#' + activeTab}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary px-4">
                        <i className="bi bi-send-fill"></i>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="card-footer text-center text-muted" style={{ backgroundColor: 'var(--bg-sidebar-hover)' }}>
                    {activeTab === 'dm' ? "Select a user to chat." : <><i className="bi bi-lock-fill me-1"></i> Only Admins can post in this channel.</>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
