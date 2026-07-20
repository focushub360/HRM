import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState({}); // Map of postId -> comment text
  const [expandedComments, setExpandedComments] = useState({}); // Map of postId -> boolean
  const [feedType, setFeedType] = useState('global'); // Default to global
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    fetchPosts();
    fetchCompanies();
  }, [user, feedType]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/companies`);
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    }
  };



  const fetchPosts = async () => {
    if (!user?.companyId) return;
    try {
      // feedType now holds the explicit company ID or 'global'
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/feed/${feedType}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Failed to fetch feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const postData = {
      companyId: user.companyId,
      author: user.name || "Unknown User",
      role: user.type ? user.type.toUpperCase() : "EMPLOYEE",
      avatar: user.name ? user.name.substring(0, 2).toUpperCase() : "U",
      authorImage: user.profileImage, // Save profile image
      content: newPostContent,
      userId: user.empId || user.email
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        setNewPostContent("");
        fetchPosts(); // Refresh feed
      } else {
        alert("Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/feed/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.empId || user.email }),
      });

      if (response.ok) {
        const { likes } = await response.json();
        setPosts(posts.map(p => p.id === postId ? { ...p, likes } : p));
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleCommentSubmit = async (postId) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;

    const commentData = {
      content,
      author: user.name,
      userId: user.empId || user.email,
      avatar: user.name ? user.name.substring(0, 2).toUpperCase() : "U",
      authorImage: user.profileImage // Save profile image
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/feed/${postId}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commentData),
      });

      if (response.ok) {
        const { comments } = await response.json();
        setPosts(posts.map(p => p.id === postId ? { ...p, comments } : p));
        setCommentInputs({ ...commentInputs, [postId]: "" });
        setExpandedComments({ ...expandedComments, [postId]: true }); // Auto expand to show new comment
      }
    } catch (error) {
      console.error("Error commenting:", error);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://hrms-backend-22uq.onrender.com/api'}/feed/${postId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Optimistic update with type safety
        setPosts(prevPosts => prevPosts.filter(p => String(p.id) !== String(postId)));
        // Optional: fetchPosts() to be 100% sure sync with backend
      } else {
        alert("Failed to delete post");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container-fluid py-4" style={{ minHeight: "100vh" }}>
      <div className="row">
        <div className="col-md-7 mx-auto">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>
              <i className="bi bi-newspaper me-2"></i> Feed
            </h2>
            <div className="d-flex align-items-center gap-2">
              <label className="fw-bold small" style={{ color: 'var(--text-main)' }}>Filter:</label>
              <select
                className="form-select shadow-sm border-primary"
                value={feedType}
                onChange={(e) => setFeedType(e.target.value)}
                style={{ width: '200px', cursor: 'pointer', color: 'var(--text-main)', backgroundColor: 'var(--bg-card)' }}
              >
                <option value="global">🌍 Global (All)</option>
                <optgroup label="Select Company">
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Post Creation Area */}
          <div className="card shadow-sm mb-4 border-0 rounded-3">
            <div className="card-body p-4">
              <div className="d-flex mb-3">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="Me" className="rounded-circle me-3 flex-shrink-0" style={{ width: "48px", height: "48px", objectFit: "cover" }} />
                ) : (
                  <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                    style={{ width: "48px", height: "48px", fontSize: "1.2rem", fontWeight: "bold" }}
                  >
                    {user.name ? user.name.substring(0, 2).toUpperCase() : "ME"}
                  </div>
                )}
                <div className="flex-grow-1">
                  <textarea
                    className="form-control border-0"
                    rows="2"
                    placeholder="Share something with your team..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    style={{ resize: "none", boxShadow: "none" }}
                  ></textarea>
                </div>
              </div>
              <div className="d-flex justify-content-end pt-2 border-top">
                <button
                  className="btn btn-primary px-4 fw-bold rounded-pill"
                  onClick={handlePostSubmit}
                  disabled={!newPostContent.trim()}
                >
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Feed Posts */}
          {posts.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-chat-square-quote fs-1 mb-3 d-block opacity-25"></i>
              <p>No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => {
              const hasLiked = post.likes && post.likes.includes(user.empId || user.email);
              const likeCount = post.likes ? post.likes.length : 0;
              const commentCount = post.comments ? post.comments.length : 0;
              const isCommentsOpen = expandedComments[post.id];

              return (
                <div className="card shadow-sm mb-4 border-0 rounded-3" key={post.id}>
                  <div className="card-body p-4">
                    {/* Header */}
                    <div className="d-flex align-items-center mb-3">
                      {post.authorImage ? (
                        <img src={post.authorImage} alt={post.author} className="rounded-circle me-3 flex-shrink-0 border shadow-sm" style={{ width: "48px", height: "48px", objectFit: "cover" }} />
                      ) : (
                        <div
                          className="rounded-circle bg-gradient text-white d-flex align-items-center justify-content-center me-3 shadow-sm"
                          style={{ width: "48px", height: "48px", fontWeight: "bold", background: "linear-gradient(45deg, #4f46e5, #9333ea)" }}
                        >
                          {post.avatar}
                        </div>
                      )}
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2">
                          <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>{post.author}</h6>
                          <span className="badge bg-light text-secondary border">{post.role}</span>
                        </div>
                        <small className="text-muted">{formatTime(post.timestamp)}</small>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        {(user.empId === post.userId || user.email === post.userId || user.role === 'admin' || user.type === 'company') && (
                          <button
                            className="btn btn-link text-danger p-0"
                            onClick={() => handleDelete(post.id)}
                            title="Delete Post"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        )}
                        {/* <button className="btn btn-link text-muted p-0"><i className="bi bi-three-dots"></i></button> */}
                      </div>
                    </div>

                    {/* Content */}
                    <p className="card-text mb-3 fs-5" style={{ whiteSpace: "pre-wrap" }}>{post.content}</p>

                    {/* Actions */}
                    <div className="d-flex gap-4 pt-3 mt-2 border-top">
                      <button
                        className={`btn btn-sm d-flex align-items-center gap-2 ${hasLiked ? "text-danger fw-bold" : "text-secondary"}`}
                        onClick={() => handleLike(post.id)}
                        style={{ transition: "all 0.2s" }}
                      >
                        <i className={`bi ${hasLiked ? "bi-heart-fill" : "bi-heart"} fs-5`}></i>
                        <span>{likeCount || "Like"}</span>
                      </button>

                      <button
                        className={`btn btn-sm d-flex align-items-center gap-2 ${isCommentsOpen ? "text-primary fw-bold" : "text-secondary"}`}
                        onClick={() => toggleComments(post.id)}
                      >
                        <i className={`bi ${isCommentsOpen ? "bi-chat-fill" : "bi-chat"} fs-5`}></i>
                        <span>{commentCount || "Comment"}</span>
                      </button>

                      <button className="btn btn-sm text-secondary d-flex align-items-center gap-2 ms-auto">
                        <i className="bi bi-share fs-5"></i>
                      </button>
                    </div>

                    {/* Comments Section */}
                    {isCommentsOpen && (
                      <div className="mt-4 pt-3 border-top rounded p-3" style={{ backgroundColor: 'var(--bg-sidebar-hover)' }}>
                        {post.comments && post.comments.map((comment, idx) => (
                          <div key={idx} className="d-flex mb-3">
                            {comment.authorImage ? (
                              <img src={comment.authorImage} alt={comment.author} className="rounded-circle me-2 flex-shrink-0 border" style={{ width: "32px", height: "32px", objectFit: "cover" }} />
                            ) : (
                              <div
                                className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2 flex-shrink-0"
                                style={{ width: "32px", height: "32px", fontSize: "0.8rem" }}
                              >
                                {comment.avatar || "U"}
                              </div>
                            )}
                            <div className="p-2 rounded shadow-sm flex-grow-1" style={{ backgroundColor: 'var(--bg-card)' }}>
                              <div className="d-flex justify-content-between">
                                <span className="fw-bold small">{comment.author}</span>
                                <small className="text-muted" style={{ fontSize: "0.7rem" }}>{formatTime(comment.timestamp)}</small>
                              </div>
                              <p className="mb-0 small" style={{ color: 'var(--text-main)' }}>{comment.content}</p>
                            </div>
                          </div>
                        ))}

                        <div className="d-flex mt-3">
                          <input
                            type="text"
                            className="form-control form-control-sm me-2"
                            placeholder="Write a comment..."
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                          />
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleCommentSubmit(post.id)}
                          >
                            <i className="bi bi-send-fill"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div >
  );
};

export default Feed;
