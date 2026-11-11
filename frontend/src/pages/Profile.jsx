import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";

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

const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [modalCommentText, setModalCommentText] = useState("");
  const [modalSubmittingComment, setModalSubmittingComment] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, myProfileRes] = await Promise.all([
        api.get(`/accounts/profile/${username}/`),
        api.get("/accounts/profile/"),
      ]);

      if (profileRes.data?.data) {
        setProfile(profileRes.data.data);
      }
      if (myProfileRes.data?.data) {
        setCurrentUser(myProfileRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [username]);

  // Handle Send Follow / Cancel Follow / Unfollow
  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;
    try {
      setFollowLoading(true);
      if (profile.is_following || profile.follow_status === "accepted" || profile.follow_status === "pending") {
        // Cancel or unfollow
        await api.post(`/accounts/unfollow/${profile.id}/`);
        setProfile((prev) => ({
          ...prev,
          is_following: false,
          follow_status: "none",
          can_follow_back: false,
          followers_count: prev.is_following ? Math.max(0, prev.followers_count - 1) : prev.followers_count,
        }));
      } else {
        // Send follow invitation
        const res = await api.post("/accounts/follow/", { user_id: profile.id });
        const newStatus = res.data?.data?.follow_status || "pending";
        setProfile((prev) => ({
          ...prev,
          follow_status: newStatus,
          is_following: newStatus === "accepted",
          can_follow_back: false,
          followers_count: newStatus === "accepted" ? prev.followers_count + 1 : prev.followers_count,
        }));
      }
    } catch (err) {
      console.error("Follow/unfollow failed:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Accept incoming follow invitation
  const handleAcceptInvitation = async () => {
    if (!profile || followLoading) return;
    try {
      setFollowLoading(true);
      const res = await api.post(`/accounts/follow/accept/${profile.id}/`);
      setProfile((prev) => ({
        ...prev,
        has_incoming_invitation: false,
        can_follow_back: res.data?.data?.can_follow_back ?? true,
        followers_count: (prev.followers_count || 0) + 1,
      }));
    } catch (err) {
      console.error("Accept invitation failed:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Decline incoming follow invitation
  const handleDeclineInvitation = async () => {
    if (!profile || followLoading) return;
    try {
      setFollowLoading(true);
      await api.post(`/accounts/follow/decline/${profile.id}/`);
      setProfile((prev) => ({
        ...prev,
        has_incoming_invitation: false,
      }));
    } catch (err) {
      console.error("Decline invitation failed:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Follow back
  const handleFollowBack = async () => {
    if (!profile || followLoading) return;
    try {
      setFollowLoading(true);
      const res = await api.post("/accounts/follow/", { user_id: profile.id });
      const newStatus = res.data?.data?.follow_status || "pending";
      setProfile((prev) => ({
        ...prev,
        can_follow_back: false,
        follow_status: newStatus,
        is_following: newStatus === "accepted",
      }));
    } catch (err) {
      console.error("Follow back failed:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Like post inside modal
  const handleModalLike = async (postId) => {
    try {
      const res = await api.post(`/accounts/posts/${postId}/toggle-like/`);
      if (res.data?.status === "success" && res.data?.data) {
        const { is_liked, no_of_likes } = res.data.data;
        setSelectedPost((prev) => (prev ? { ...prev, is_liked, likes_count: no_of_likes } : prev));
        setProfile((prev) => ({
          ...prev,
          posts: prev.posts.map((p) =>
            p.id === postId ? { ...p, is_liked, likes_count: no_of_likes } : p
          ),
        }));
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  // Add comment inside modal
  const handleModalAddComment = async (e, postId) => {
    e.preventDefault();
    if (!modalCommentText.trim() || modalSubmittingComment) return;
    try {
      setModalSubmittingComment(true);
      const res = await api.post(`/accounts/posts/${postId}/comments/`, {
        comment_text: modalCommentText.trim(),
      });
      if (res.data?.status === "success" && res.data?.data) {
        const newComment = res.data.data;
        setSelectedPost((prev) => (prev ? { ...prev, comments: [...(prev.comments || []), newComment] } : prev));
        setProfile((prev) => ({
          ...prev,
          posts: prev.posts.map((p) =>
            p.id === postId ? { ...p, comments: [...(p.comments || []), newComment] } : p
          ),
        }));
        setModalCommentText("");
      }
    } catch (err) {
      console.error("Add comment failed:", err);
    } finally {
      setModalSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar currentUser={currentUser} />
        <div className="flex justify-center items-center h-[70vh]">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar currentUser={currentUser} />
        <div className="max-w-md mx-auto text-center py-20 space-y-4">
          <h2 className="text-2xl font-bold">User Not Found</h2>
          <p className="text-gray-400">The profile for @{username} doesn't seem to exist.</p>
          <Link
            to="/home"
            className="inline-block bg-teal-500 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  const isSelf =
    profile.is_self ||
    (currentUser &&
      (profile.id === currentUser.id ||
        profile.username.toLowerCase() === currentUser.username.toLowerCase()));

  const posts = profile.posts || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      <Navbar currentUser={currentUser} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-8 relative z-10">
            {/* Avatar */}
            <div className="relative">
              <img
                src={profile.profileimg || "/media/blank-profile-picture.png"}
                alt={profile.username}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/media/blank-profile-picture.png";
                }}
                className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover border-4 border-slate-800 shadow-xl"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center sm:text-left space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                    @{profile.username}
                  </h1>
                  {profile.location && (
                    <p className="text-xs text-gray-400 flex items-center justify-center sm:justify-start space-x-1 mt-1">
                      <svg className="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{profile.location}</span>
                    </p>
                  )}
                </div>

                {/* Profile Action Buttons */}
                <div>
                  {isSelf ? (
                    <Link
                      to="/settings"
                      className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-teal-300 font-medium px-5 py-2.5 rounded-xl text-sm border border-slate-700 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>Edit Profile & Face ID</span>
                    </Link>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                      {/* Incoming invitation: Accept & Decline */}
                      {profile.has_incoming_invitation ? (
                        <>
                          <button
                            onClick={handleAcceptInvitation}
                            disabled={followLoading}
                            className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm transition shadow-md"
                          >
                            Accept Invitation
                          </button>
                          <button
                            onClick={handleDeclineInvitation}
                            disabled={followLoading}
                            className="bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium px-4 py-2.5 rounded-xl text-sm border border-slate-700 transition"
                          >
                            Decline
                          </button>
                        </>
                      ) : profile.can_follow_back && (!profile.follow_status || profile.follow_status === "none") ? (
                        /* Follow Back Option */
                        <button
                          onClick={handleFollowBack}
                          disabled={followLoading}
                          className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-md flex items-center space-x-1.5"
                        >
                          <span>Follow Back</span>
                        </button>
                      ) : (
                        /* Standard Follow / Requested / Following button */
                        <button
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-md flex items-center justify-center space-x-2 ${
                            profile.is_following || profile.follow_status === "accepted"
                              ? "bg-slate-800 hover:bg-rose-950/60 text-gray-300 hover:text-rose-400 border border-slate-700"
                              : profile.follow_status === "pending"
                              ? "bg-slate-800 text-teal-400 border border-teal-500/40 hover:bg-rose-950/60 hover:text-rose-400"
                              : "bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white"
                          }`}
                        >
                          <span>
                            {profile.is_following || profile.follow_status === "accepted"
                              ? "Following"
                              : profile.follow_status === "pending"
                              ? "Requested (Cancel)"
                              : "Follow"}
                          </span>
                        </button>
                      )}

                      {/* Direct Message Link */}
                      <Link
                        to={`/chat?userId=${profile.id}`}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-500/30 transition flex items-center space-x-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Message</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <p className="text-sm text-gray-300 max-w-xl leading-relaxed">
                {profile.bio || "No bio yet."}
              </p>

              {/* Counters */}
              <div className="flex items-center justify-center sm:justify-start space-x-8 pt-2 border-t border-slate-800/80">
                <div>
                  <span className="font-extrabold text-white text-lg">{posts.length}</span>
                  <span className="text-xs text-gray-400 ml-1.5 uppercase tracking-wider">Posts</span>
                </div>
                <div>
                  <span className="font-extrabold text-white text-lg">{profile.followers_count || 0}</span>
                  <span className="text-xs text-gray-400 ml-1.5 uppercase tracking-wider">Followers</span>
                </div>
                <div>
                  <span className="font-extrabold text-white text-lg">{profile.following_count || 0}</span>
                  <span className="text-xs text-gray-400 ml-1.5 uppercase tracking-wider">Following</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Gallery */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{isSelf ? "My Posts" : `Posts by @${profile.username}`}</span>
          </h3>

          {posts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-gray-400 text-sm">
              {isSelf
                ? "You haven't posted any updates yet. Click 'New Post' on the navigation bar to share your first post!"
                : `No posts shared by @${profile.username} yet.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer group hover:border-teal-500/50 transition duration-200 relative aspect-square flex flex-col justify-between"
                >
                  {post.image ? (
                    <img
                      src={post.image}
                      alt="post"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = "none";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full p-4 flex items-center justify-center text-center bg-slate-950 text-gray-300 text-xs">
                      <p className="line-clamp-4">{post.caption}</p>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center space-x-6 text-white text-sm font-bold">
                    <div className="flex items-center space-x-1.5">
                      <svg className="w-5 h-5 text-rose-500 fill-rose-500" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span>{post.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>{post.comments?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <img
                  src={profile.profileimg || "/media/blank-profile-picture.png"}
                  alt={profile.username}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/media/blank-profile-picture.png";
                  }}
                  className="w-10 h-10 rounded-full object-cover border border-slate-700"
                />
                <div>
                  <span className="font-bold text-white text-sm">@{profile.username}</span>
                  <p className="text-[11px] text-gray-400">{timeSince(selectedPost.created_at)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Post Image */}
            {selectedPost.image && (
              <div className="bg-black rounded-2xl overflow-hidden max-h-96 flex items-center justify-center">
                <img
                  src={selectedPost.image}
                  alt="post"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = "none";
                  }}
                  className="w-full object-contain max-h-96"
                />
              </div>
            )}

            {/* Caption */}
            {selectedPost.caption && (
              <p className="text-sm text-gray-200 whitespace-pre-line leading-relaxed">
                {selectedPost.caption}
              </p>
            )}

            {/* Like & Comments count */}
            <div className="flex items-center space-x-6 text-xs text-gray-300 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleModalLike(selectedPost.id)}
                className="flex items-center space-x-1.5 hover:text-rose-400 transition"
              >
                <svg
                  className={`w-5 h-5 ${
                    selectedPost.is_liked ? "text-rose-500 fill-rose-500" : "text-gray-400"
                  }`}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill={selectedPost.is_liked ? "currentColor" : "none"}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span className={selectedPost.is_liked ? "text-rose-400 font-bold" : ""}>
                  {selectedPost.likes_count || 0} likes
                </span>
              </button>
              <span className="flex items-center space-x-1.5">
                <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{selectedPost.comments?.length || 0} comments</span>
              </span>
            </div>

            {/* Comments List */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {(selectedPost.comments || []).length === 0 ? (
                <p className="text-xs text-gray-500 py-2">No comments yet.</p>
              ) : (
                selectedPost.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-2.5 text-xs">
                    <img
                      src={comment.profileimg || "/media/blank-profile-picture.png"}
                      alt={comment.username}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/media/blank-profile-picture.png";
                      }}
                      className="w-6 h-6 rounded-full object-cover border border-slate-800 flex-shrink-0"
                    />
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-teal-300">@{comment.username}</span>
                        <span className="text-[10px] text-gray-500">{timeSince(comment.created_at)}</span>
                      </div>
                      <p className="text-gray-200 mt-0.5">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Comment Input */}
            <form onSubmit={(e) => handleModalAddComment(e, selectedPost.id)} className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={modalCommentText}
                onChange={(e) => setModalCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={modalSubmittingComment || !modalCommentText.trim()}
                className="bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                {modalSubmittingComment ? "..." : "Reply"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
