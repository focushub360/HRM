import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api');

const Chat = () => {
  const { user, companies, socket, setChatUnreadCount } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("company"); // company, hr, broadcast, team, dm
  const [targetTeam, setTargetTeam] = useState("");
  const [targetUser, setTargetUser] = useState(null); // { id, name, role, email, avatar }
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const messagesEndRef = useRef(null);

  const isSuperAdmin = !user?.companyId || user?.role === 'admin';
  const isAdminOrHR = user?.type === "company" || user?.type === "hr" || isSuperAdmin;
  const [targetCompany, setTargetCompany] = useState(user?.companyId || "");

  useEffect(() => {
    if (isSuperAdmin && companies?.length > 0 && !targetCompany) {
      setTargetCompany(companies[0].id);
    }
  }, [isSuperAdmin, companies, targetCompany]);

  const activeCompanyId = isSuperAdmin ? targetCompany : user?.companyId;

  // Active Company Employees for DMs and Team chat
  const companyEmployees = useMemo(() => {
    if (!companies || !activeCompanyId) return [];
    const comp = companies.find(c => c.id?.toString() === activeCompanyId?.toString());
    const list = comp?.employeeAccounts || [];
    // Also include HR accounts if available
    const hrList = (comp?.hrAccounts || []).map(h => ({
      id: h.id || h.empId || h.email,
      name: h.name || 'HR Manager',
      email: h.email,
      role: 'HR Manager',
      department: 'HR'
    }));
    const allEmployees = [...hrList, ...list];
    
    // Filter out the currently logged-in user
    return allEmployees.filter(emp => {
      const isSameEmail = emp.email && user?.email && emp.email === user.email;
      const isSameId = emp.id && (emp.id === user?.id || emp.id === user?.empId);
      const isSameEmpId = emp.empId && (emp.empId === user?.id || emp.empId === user?.empId);
      return !isSameEmail && !isSameId && !isSameEmpId;
    });
  }, [companies, activeCompanyId, user]);

  // Unique departments in active company
  const departments = useMemo(() => {
    const depts = new Set(["General", "Development", "Sales", "Operations", "Marketing"]);
    companyEmployees.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return Array.from(depts);
  }, [companyEmployees]);

  useEffect(() => {
    if (activeTab === "team" && !targetTeam) {
      setTargetTeam(user?.department || "General");
    }
  }, [activeTab, user, targetTeam]);

  // Scroll smoothly to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch real messages from MongoDB backend
  const fetchMessages = async () => {
    if (!user || !activeCompanyId) return;

    try {
      const params = new URLSearchParams();
      params.append('companyId', activeCompanyId);
      params.append('channel', activeTab);

      if (activeTab === 'team' || activeTab === 'broadcast') {
        const group = isAdminOrHR ? (targetTeam || 'General') : (user?.department || 'General');
        params.append('targetGroup', group);
      } else if (activeTab === 'dm') {
        if (!targetUser) {
          setMessages([]);
          return;
        }
        params.append('senderId', user?.empId || user?.id);
        params.append('receiverId', targetUser.id || targetUser.empId || targetUser.email);
      }

      const res = await fetch(`${API_BASE}/chat/messages?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data || []);
        setIsLiveConnected(true);
      }
    } catch (err) {
      console.error("Error loading chat messages:", err);
      setIsLiveConnected(false);
    }
  };

  // Fetch on tab switch
  useEffect(() => {
    fetchMessages();
  }, [activeTab, targetTeam, targetUser, activeCompanyId]);

  // Reset unread count when viewing chat
  useEffect(() => {
    if (setChatUnreadCount) {
      setChatUnreadCount(0);
    }
  }, [activeTab, setChatUnreadCount]);

  // Real-time Socket.io listener
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (msg) => {
      // Check if it belongs to current active tab context
      let shouldAppend = false;
      if (activeTab === 'dm' && msg.channel === 'dm') {
        const currentUserId = user?.empId || user?.id || user?.email;
        const chatPartnerId = targetUser?.id || targetUser?.empId || targetUser?.email;
        if (
          (msg.senderId === currentUserId && msg.receiverId === chatPartnerId) ||
          (msg.senderId === chatPartnerId && msg.receiverId === currentUserId)
        ) {
          shouldAppend = true;
        }
      } else if (msg.channel === activeTab) {
        if (activeTab === 'team' || activeTab === 'broadcast') {
          const group = isAdminOrHR ? (targetTeam || 'General') : (user?.department || 'General');
          if (msg.targetGroup === group) shouldAppend = true;
        } else {
          shouldAppend = true; // company or hr
        }
      }
      
      if (shouldAppend) {
        setMessages(prev => {
          // Avoid duplicates
          if (msg._id && prev.some(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('new-chat-message', handleNewMessage);
    return () => {
      socket.off('new-chat-message', handleNewMessage);
    };
  }, [socket, activeTab, targetTeam, targetUser, user, isAdminOrHR]);

  // Send real message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user || !activeCompanyId || sending) return;

    const currentContent = newMessage.trim();
    setNewMessage("");
    setSending(true);

    const senderId = user.empId || user.id || user.email;
    const senderName = user.name || "Employee";
    const senderRole = user.type === 'company' ? 'Company Admin' : user.type === 'hr' ? 'HR Manager' : (user.role || 'Employee');
    const senderAvatar = user.profileImage || '';

    const payload = {
      companyId: activeCompanyId,
      channel: activeTab,
      targetGroup: (activeTab === 'team' || activeTab === 'broadcast') ? (targetTeam || user.department || 'General') : 'General',
      senderId,
      senderName,
      senderRole,
      senderAvatar,
      content: currentContent,
      receiverId: activeTab === 'dm' ? (targetUser?.id || targetUser?.empId || targetUser?.email) : '',
      receiverName: activeTab === 'dm' ? (targetUser?.name || 'User') : '',
      createdAt: new Date().toISOString()
    };

    // Optimistic UI update
    const tempMessage = {
      ...payload,
      id: 'temp-' + Date.now(),
      isTemp: true
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const res = await fetch(`${API_BASE}/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        setMessages(prev => prev.map(m => m.id === tempMessage.id ? saved : m));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  // Filtered employees for Direct Messages list
  const filteredUsers = useMemo(() => {
    return companyEmployees.filter(emp => {
      // Check if it's the current user (using all possible ID fields to be safe)
      if (
        String(emp.id) === String(user.id) || 
        String(emp.empId) === String(user.empId) || 
        (emp.email && user.email && emp.email === user.email)
      ) {
        return false;
      }
      
      if (!searchUserQuery) return true;
      const q = searchUserQuery.toLowerCase();
      return (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q));
    });
  }, [companyEmployees, user, searchUserQuery]);

  const getChannelTitle = () => {
    switch (activeTab) {
      case "company":
        return "🏢 Company General Chat";
      case "hr":
        return "🛡️ HR & Employee Support";
      case "broadcast":
        return `📢 Announcements - ${targetTeam || user?.department || 'General'}`;
      case "team":
        return `👥 Team Chat - ${targetTeam || user?.department || 'General'}`;
      case "dm":
        return targetUser ? `💬 Chat with ${targetUser.name}` : "💬 Direct Messages";
      default:
        return "Chat";
    }
  };

  const getChannelDescription = () => {
    switch (activeTab) {
      case "company":
        return "All team members in the company";
      case "hr":
        return "HR queries, support tickets, and private assistance";
      case "broadcast":
        return "Official announcements and company updates (Read-Only for Employees)";
      case "team":
        return `Departmental collaboration for ${targetTeam || user?.department || 'General'}`;
      case "dm":
        return targetUser ? `Private conversation with ${targetUser.email || targetUser.name}` : "Select a colleague to start a 1-on-1 message";
      default:
        return "";
    }
  };

  return (
    <div className="container-fluid py-3" style={{ color: 'var(--text-main)', height: 'calc(100vh - 85px)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Title Bar */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-shrink-0">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center text-white"
            style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
          >
            <i className="bi bi-chat-dots-fill fs-5"></i>
          </div>
          <div>
            <h4 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>FE Communication Hub</h4>
            <small className="text-muted">Real-time team messaging, channels, and direct chats</small>
          </div>
        </div>

        {/* Company Selector for Super Admin */}
        {isSuperAdmin && (
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted fw-semibold">Company:</span>
            <select
              className="form-select form-select-sm"
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)', minWidth: '180px' }}
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Chat Container */}
      <div
        className="card border-0 shadow-sm flex-grow-1 overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '18px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'row'
        }}
      >
        {/* Left Sidebar: Channels & DMs */}
        <div
          style={{
            width: '280px',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-main)',
            flexShrink: 0
          }}
        >
          {/* Channels Header */}
          <div className="p-3 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Channels
            </span>
          </div>

          {/* Channel List */}
          <div className="p-2 d-flex flex-column gap-1 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
            {/* Company General */}
            <button
              type="button"
              className="btn btn-sm text-start d-flex align-items-center justify-content-between p-2 rounded-3 border-0"
              onClick={() => { setActiveTab("company"); setTargetUser(null); }}
              style={{
                backgroundColor: activeTab === "company" ? '#4f46e5' : 'transparent',
                color: activeTab === "company" ? '#ffffff' : 'var(--text-main)',
                fontWeight: activeTab === "company" ? 600 : 500
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-buildings"></i>
                <span>Company General</span>
              </div>
            </button>

            {/* HR & Support */}
            <button
              type="button"
              className="btn btn-sm text-start d-flex align-items-center justify-content-between p-2 rounded-3 border-0"
              onClick={() => { setActiveTab("hr"); setTargetUser(null); }}
              style={{
                backgroundColor: activeTab === "hr" ? '#4f46e5' : 'transparent',
                color: activeTab === "hr" ? '#ffffff' : 'var(--text-main)',
                fontWeight: activeTab === "hr" ? 600 : 500
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-shield-check"></i>
                <span>HR & Support</span>
              </div>
            </button>

            {/* Announcements */}
            <button
              type="button"
              className="btn btn-sm text-start d-flex align-items-center justify-content-between p-2 rounded-3 border-0"
              onClick={() => { setActiveTab("broadcast"); setTargetUser(null); }}
              style={{
                backgroundColor: activeTab === "broadcast" ? '#4f46e5' : 'transparent',
                color: activeTab === "broadcast" ? '#ffffff' : 'var(--text-main)',
                fontWeight: activeTab === "broadcast" ? 600 : 500
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-megaphone"></i>
                <span>Announcements</span>
              </div>
              <span className="badge bg-secondary bg-opacity-50" style={{ fontSize: '0.65rem' }}>Read Only</span>
            </button>

            {/* Team Chat */}
            <button
              type="button"
              className="btn btn-sm text-start d-flex align-items-center justify-content-between p-2 rounded-3 border-0"
              onClick={() => { setActiveTab("team"); setTargetUser(null); }}
              style={{
                backgroundColor: activeTab === "team" ? '#4f46e5' : 'transparent',
                color: activeTab === "team" ? '#ffffff' : 'var(--text-main)',
                fontWeight: activeTab === "team" ? 600 : 500
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="bi bi-people"></i>
                <span>Team Chat</span>
              </div>
              {targetTeam && (
                <span className="badge bg-primary bg-opacity-20 text-primary" style={{ fontSize: '0.65rem' }}>
                  {targetTeam}
                </span>
              )}
            </button>
          </div>

          {/* Department Picker for Team Chat */}
          {activeTab === 'team' && isAdminOrHR && (
            <div className="p-2 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
              <label className="small text-muted fw-bold mb-1" style={{ fontSize: '0.72rem' }}>Department:</label>
              <select
                className="form-select form-select-sm"
                value={targetTeam}
                onChange={(e) => setTargetTeam(e.target.value)}
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Direct Messages Section */}
          <div className="p-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.08em' }}>
              Direct Messages
            </span>
            <span className="badge bg-secondary bg-opacity-25" style={{ fontSize: '0.7rem' }}>
              {filteredUsers.length}
            </span>
          </div>

          {/* DM Search Box */}
          <div className="p-2">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-transparent border-end-0" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search coworker..."
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              />
            </div>
          </div>

          {/* Direct Messages User List */}
          <div className="p-2 flex-grow-1 overflow-y-auto d-flex flex-column gap-1">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const uid = u.id || u.empId || u.email;
                const isSelected = activeTab === "dm" && (targetUser?.id === uid || targetUser?.email === u.email);
                return (
                  <button
                    key={uid}
                    type="button"
                    className="btn btn-sm text-start d-flex align-items-center gap-2 p-2 rounded-3 border-0"
                    onClick={() => {
                      setActiveTab("dm");
                      setTargetUser(u);
                    }}
                    style={{
                      backgroundColor: isSelected ? '#4f46e5' : 'transparent',
                      color: isSelected ? '#ffffff' : 'var(--text-main)'
                    }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
                      style={{
                        width: '30px',
                        height: '30px',
                        backgroundColor: isSelected ? '#3730a3' : '#6366f1',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}
                    >
                      {u.profileImage ? (
                        <img src={u.profileImage} alt="" className="w-100 h-100 rounded-circle object-fit-cover" />
                      ) : (
                        u.name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="min-w-0 flex-grow-1">
                      <div className="text-truncate fw-semibold" style={{ fontSize: '0.85rem' }}>
                        {u.name || u.email}
                      </div>
                      <small className="text-truncate d-block" style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                        {u.role || u.department || 'Coworker'}
                      </small>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-4 text-muted small">
                No coworkers found.
              </div>
            )}
          </div>

          {/* Logged in User Bar */}
          <div className="p-3 border-top d-flex align-items-center gap-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0"
              style={{ width: '34px', height: '34px', backgroundColor: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="text-truncate fw-bold small">{user?.name}</div>
              <span className="badge bg-success bg-opacity-20 text-success" style={{ fontSize: '0.65rem' }}>Online</span>
            </div>
          </div>
        </div>

        {/* Right Pane: Messages Stream & Composer */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Chat Header */}
          <div
            className="p-3 border-bottom d-flex justify-content-between align-items-center"
            style={{
              borderColor: 'var(--border-color)',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: '#ffffff'
            }}
          >
            <div>
              <h6 className="mb-0 fw-bold">{getChannelTitle()}</h6>
              <small style={{ opacity: 0.85, fontSize: '0.78rem' }}>{getChannelDescription()}</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-light text-dark shadow-sm">
                <span className="spinner-grow spinner-grow-sm me-1 text-success" style={{ width: '6px', height: '6px' }} role="status"></span>
                {isLiveConnected ? 'Live MongoDB Sync' : 'Reconnecting...'}
              </span>
            </div>
          </div>

          {/* Messages Stream Container */}
          <div
            className="p-4 flex-grow-1 overflow-y-auto d-flex flex-column gap-3"
            style={{ backgroundColor: 'var(--bg-main)', minHeight: 0 }}
          >
            {messages.length === 0 ? (
              <div className="text-center my-auto py-5">
                <div
                  className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: '64px', height: '64px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}
                >
                  <i className="bi bi-chat-heart fs-2"></i>
                </div>
                <h6 className="fw-bold" style={{ color: 'var(--text-main)' }}>No messages yet</h6>
                <p className="text-muted small mb-0">Start the conversation! Messages are saved permanently.</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMine = (msg.senderId === (user.empId || user.id || user.email));
                return (
                  <div
                    key={msg.id || msg._id || index}
                    className={`d-flex gap-2 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}
                  >
                    {!isMine && (
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0 shadow-sm"
                        style={{ width: '36px', height: '36px', backgroundColor: '#6366f1', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        {msg.senderAvatar ? (
                          <img src={msg.senderAvatar} alt="" className="w-100 h-100 rounded-circle object-fit-cover" />
                        ) : (
                          msg.senderName?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                    )}

                    <div style={{ maxWidth: '72%' }}>
                      {!isMine && (
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="fw-bold small" style={{ color: 'var(--text-main)' }}>{msg.senderName}</span>
                          <span className="badge bg-secondary bg-opacity-25 text-muted" style={{ fontSize: '0.65rem' }}>
                            {msg.senderRole}
                          </span>
                        </div>
                      )}

                      <div
                        className="p-3 shadow-sm"
                        style={{
                          borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          backgroundColor: isMine ? '#4f46e5' : 'var(--bg-card)',
                          color: isMine ? '#ffffff' : 'var(--text-main)',
                          border: isMine ? 'none' : '1px solid var(--border-color)',
                          fontSize: '0.9rem',
                          wordBreak: 'break-word',
                          lineHeight: '1.45'
                        }}
                      >
                        {msg.content}
                      </div>

                      <div className={`d-flex align-items-center gap-1 mt-1 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                        <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </small>
                        {isMine && (
                          <i className="bi bi-check2-all text-primary" style={{ fontSize: '0.85rem' }}></i>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Box */}
          <div
            className="p-3 border-top"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            {activeTab === 'broadcast' && !isAdminOrHR ? (
              <div className="alert alert-secondary mb-0 py-2 text-center small">
                <i className="bi bi-lock-fill me-1"></i> Announcements channel is read-only. Only HR and Admins can post.
              </div>
            ) : activeTab === 'dm' && !targetUser ? (
              <div className="alert alert-info mb-0 py-2 text-center small">
                <i className="bi bi-person-lines-fill me-1"></i> Please select a colleague from the left to start direct messaging.
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="d-flex align-items-center gap-2">
                <input
                  type="text"
                  className="form-control py-2 px-3"
                  placeholder={
                    activeTab === 'dm' && targetUser ? `Message @${targetUser.name}...` :
                    activeTab === 'team' ? `Message #${targetTeam || 'General'}...` :
                    activeTab === 'broadcast' ? 'Post an official announcement...' :
                    'Type your message here (Enter to send)...'
                  }
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={sending}
                  style={{
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '12px'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="btn btn-primary px-3 py-2 fw-semibold d-flex align-items-center gap-1"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
                  }}
                >
                  <i className="bi bi-send-fill"></i>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
