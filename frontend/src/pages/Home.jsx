import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import CreatePostModal from "../components/CreatePostModal";

function timeSince(dateString) {
  if (!dateString) return "just now";
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";

  const units = [
    { label: "y", secs: 31536000 },
    { label: "mo", secs: 2592000 },
    { label: "d", secs: 86400 },
    { label: "h", secs: 3600 },
    { label: "m", secs: 60 },
  ];

  for (const unit of units) {
    const value = Math.floor(seconds / unit.secs);
    if (value >= 1) return `${value}${unit.label} ago`;
  }
  return "just now";
}

function CommentItem({ comment, postId, currentUser, onReplyAdded }) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [postingReply, setPostingReply] = useState(false);
  const replies = comment.replies || [];

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || postingReply) return;
    try {
      setPostingReply(true);
      const res = await api.post(
        `/accounts/posts/${postId}/comments/${comment.id}/replies/`,
        { comment_text: replyText.trim() }
      );
      if (res.data?.status === "success" && res.data?.data) {
        onReplyAdded(comment.id, res.data.data);
        setReplyText("");
        setShowReplyInput(false);
        setShowReplies(true);
      }
    } catch (err) {
      console.error("Add reply failed:", err);
    } finally {
      setPostingReply(false);
    }
  };

  return (
    <div className="text-xs space-y-1.5">
      {/* Main comment */}
      <div className="flex items-start space-x-2.5">
        <img
          src={comment.profileimg || "/media/blank-profile-picture.png"}
          alt={comment.username}
          onError={(e) => { e.target.onerror = null; e.target.src = "/media/blank-profile-picture.png"; }}
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-slate-800"
        />
        <div className="flex-1">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-semibold text-teal-300">@{comment.username}</span>
              <span className="text-[10px] text-gray-500">{timeSince(comment.created_at)}</span>
            </div>
            <p className="text-gray-200">{comment.text}</p>
          </div>
          {/* Reply + toggle controls */}
          <div className="flex items-center space-x-3 mt-1 pl-1">
            <button
              onClick={() => setShowReplyInput((v) => !v)}
              className="text-[11px] text-teal-400 hover:text-teal-300 font-medium transition"
            >
              {showReplyInput ? "Cancel" : "Reply"}
            </button>
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies((v) => !v)}
                className="text-[11px] text-gray-400 hover:text-gray-200 transition"
              >
                {showReplies ? "Hide" : `View`} {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reply Input */}
      {showReplyInput && (
        <form onSubmit={handleAddReply} className="flex items-center space-x-2 pl-9 mt-1">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Reply to @${comment.username}...`}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={postingReply || !replyText.trim()}
            className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs transition"
          >
            {postingReply ? "..." : "Send"}
          </button>
        </form>
      )}

      {/* Nested Replies */}
      {showReplies && replies.length > 0 && (
        <div className="pl-9 space-y-2 mt-1">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start space-x-2">
              <img
                src={reply.profileimg || "/media/blank-profile-picture.png"}
                alt={reply.username}
                onError={(e) => { e.target.onerror = null; e.target.src = "/media/blank-profile-picture.png"; }}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-slate-800"
              />
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-1.5 flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-teal-300 text-[11px]">@{reply.username}</span>
                  <span className="text-[10px] text-gray-500">{timeSince(reply.created_at)}</span>
                </div>
                <p className="text-gray-200 text-[11px]">{reply.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PostCard({ post, currentUser, onLikeToggled, onCommentAdded, onPostDeleted }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [liking, setLiking] = useState(false);
  const [localComments, setLocalComments] = useState(post.comments || []);

  // Sync when post prop changes
  useState(() => { setLocalComments(post.comments || []); }, [post.comments]);

  const isOwner = currentUser?.username === post.author || currentUser?.id === post.author_id;

  const handleLike = async () => {
    if (liking) return;
    try {
      setLiking(true);
      const res = await api.post(`/accounts/posts/${post.id}/toggle-like/`);
      if (res.data?.status === "success" && res.data?.data) {
        onLikeToggled(post.id, res.data.data);
      }
    } catch (err) {
      console.error("Like toggle failed:", err);
    } finally {
      setLiking(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || postingComment) return;

    try {
      setPostingComment(true);
      const res = await api.post(`/accounts/posts/${post.id}/comments/`, {
        comment_text: commentText.trim(),
      });
      if (res.data?.status === "success" && res.data?.data) {
        const newComment = { ...res.data.data, replies: [] };
        setLocalComments((prev) => [...prev, newComment]);
        onCommentAdded(post.id, newComment);
        setCommentText("");
      }
    } catch (err) {
      console.error("Add comment failed:", err);
    } finally {
      setPostingComment(false);
    }
  };

  const handleReplyAdded = (commentId, newReply) => {
    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
      )
    );
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await api.delete(`/accounts/posts/${post.id}/`);
      onPostDeleted(post.id);
    } catch (err) {
      console.error("Delete post failed:", err);
    }
  };

  const comments = localComments;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden transition hover:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Link to={`/profile/${post.author}`}>
            <img
              src={post.author_profileimg || "/media/blank-profile-picture.png"}
              alt={post.author}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/media/blank-profile-picture.png";
              }}
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
            />
          </Link>
          <div>
            <Link
              to={`/profile/${post.author}`}
              className="font-bold text-white hover:text-teal-400 text-sm transition"
            >
              @{post.author}
            </Link>
            <p className="text-xs text-gray-400">{timeSince(post.created_at)}</p>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={handleDeletePost}
            title="Delete post"
            className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Caption if at top or without image */}
      {post.caption && (
        <div className="px-5 py-3 text-sm text-gray-200 whitespace-pre-line leading-relaxed">
          {post.caption}
        </div>
      )}

      {/* Post Image */}
      {post.image && (
        <div className="bg-black max-h-[500px] overflow-hidden flex items-center justify-center">
          <img
            src={post.image}
            alt="Post content"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = "none";
            }}
            className="w-full object-contain max-h-[500px]"
            loading="lazy"
          />
        </div>
      )}

      {/* Action Bar (Like, Comment, Count) */}
      <div className="px-5 py-3 border-t border-slate-800/60">
        <div className="flex items-center space-x-6">
          {/* Like Button */}
          <button
            onClick={handleLike}
            disabled={liking}
            className="flex items-center space-x-2 text-sm group focus:outline-none"
          >
            <svg
              className={`w-6 h-6 transition transform active:scale-125 ${
                post.is_liked ? "text-rose-500 fill-rose-500" : "text-gray-400 group-hover:text-rose-400"
              }`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              fill={post.is_liked ? "currentColor" : "none"}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span className={`font-medium ${post.is_liked ? "text-rose-400" : "text-gray-400"}`}>
              {post.likes_count || 0}
            </span>
          </button>

          {/* Comment Toggle */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-sm text-gray-400 hover:text-teal-400 group focus:outline-none transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="font-medium">{comments.length}</span>
          </button>
        </div>

        {/* Comment Drawer */}
        {showComments && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
            {/* Comments List */}
            <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
              {comments.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">No comments yet. Be the first!</p>
              ) : (
                comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    postId={post.id}
                    currentUser={currentUser}
                    onReplyAdded={handleReplyAdded}
                  />
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={postingComment || !commentText.trim()}
                className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                {postingComment ? "..." : "Post"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Home() {
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inlineCaption, setInlineCaption] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileRes, postsRes, suggestionsRes] = await Promise.all([
        api.get("/accounts/profile/"),
        api.get("/accounts/posts/"),
        api.get("/accounts/suggestions/"),
      ]);

      if (profileRes.data?.data) {
        setCurrentUser(profileRes.data.data);
      }
      if (postsRes.data?.data) {
        setPosts(postsRes.data.data);
      }
      if (suggestionsRes.data?.data) {
        setSuggestions(suggestionsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load feed data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLikeToggled = (postId, data) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: data.is_liked, likes_count: data.no_of_likes }
          : p
      )
    );
  };

  const handleCommentAdded = (postId, newComment) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [...(p.comments || []), { ...newComment, replies: newComment.replies || [] }] }
          : p
      )
    );
  };

  const handleReplyAddedInFeed = (postId, commentId, newReply) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: (p.comments || []).map((c) =>
                c.id === commentId ? { ...c, replies: [...(c.replies || []), newReply] } : c
              ),
            }
          : p
      )
    );
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handleFollowUser = async (userId, targetUsername) => {
    try {
      const res = await api.post("/accounts/follow/", { user_id: userId });
      if (res.status === 200 || res.status === 201) {
        setSuggestions((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_requested: true } : u))
        );
        setTimeout(() => {
          setSuggestions((prev) => prev.filter((u) => u.id !== userId));
        }, 1200);
        // Refresh feed so newly followed user's posts show up if auto-accepted
        const feedRes = await api.get("/accounts/posts/");
        if (feedRes.data?.data) {
          setPosts(feedRes.data.data);
        }
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 font-sans">
      <Navbar onOpenCreatePost={() => setIsCreateModalOpen(true)} currentUser={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Feed Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Quick Create Post Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center space-x-3">
                <img
                  src={currentUser?.profileimg || "/media/blank-profile-picture.png"}
                  alt="avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/media/blank-profile-picture.png";
                  }}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex-1 text-left bg-slate-950 border border-slate-800 text-gray-400 hover:text-gray-200 px-4 py-2.5 rounded-xl text-sm hover:border-slate-700 transition"
                >
                  Share something new, {currentUser?.username || "friend"}...
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white p-2.5 rounded-xl transition shadow-md shadow-teal-500/10"
                  title="Attach Photo / Create Post"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Posts List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm">Loading feed...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-800 text-teal-400 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Your Feed is Quiet</h3>
                  <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                    Create your first post or follow some friends on the right to see what everyone is up to!
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm hover:from-teal-600 hover:to-emerald-700 transition shadow-lg shadow-teal-500/10"
                >
                  Create First Post
                </button>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onLikeToggled={handleLikeToggled}
                  onCommentAdded={handleCommentAdded}
                  onPostDeleted={handlePostDeleted}
                />
              ))
            )}
          </div>

          {/* Right Sidebar: Suggestions */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  People to Follow
                </h3>
                <button
                  onClick={loadData}
                  className="text-xs text-teal-400 hover:text-teal-300 transition"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-4 divide-y divide-slate-800/60">
                {suggestions.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">
                    No suggestions right now. You're connected with everyone!
                  </p>
                ) : (
                  suggestions.map((user) => (
                    <div key={user.id} className="py-3 flex items-center justify-between space-x-3">
                      <Link
                        to={`/profile/${user.username}`}
                        className="flex items-center space-x-3 min-w-0 group"
                      >
                        <img
                          src={user.profileimg || "/media/blank-profile-picture.png"}
                          alt={user.username}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/media/blank-profile-picture.png";
                          }}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700 group-hover:border-teal-400 transition"
                        />
                        <div className="truncate">
                          <p className="text-sm font-semibold text-white group-hover:text-teal-400 transition truncate">
                            @{user.username}
                          </p>
                          {user.bio ? (
                            <p className="text-xs text-gray-400 truncate">{user.bio}</p>
                          ) : (
                            <p className="text-xs text-emerald-400/80">New on DVChat</p>
                          )}
                        </div>
                      </Link>

                      <button
                        onClick={() => handleFollowUser(user.id, user.username)}
                        disabled={user.is_requested}
                        className={`flex-shrink-0 font-semibold px-3 py-1.5 rounded-xl text-xs transition border ${
                          user.is_requested
                            ? "bg-slate-800 text-teal-400 border-teal-500/40"
                            : "bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-teal-400 border-teal-500/20"
                        }`}
                      >
                        {user.is_requested ? "Requested" : "Follow"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
        currentUser={currentUser}
      />
    </div>
  );
}

export default Home;
