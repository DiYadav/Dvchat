import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { clearTokens } from "../auth/TokenService";

function timeSince(dateString) {
  if (!dateString) return "";
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units = [
    { label: "d", secs: 86400 },
    { label: "h", secs: 3600 },
    { label: "m", secs: 60 },
  ];
  for (const unit of units) {
    const value = Math.floor(seconds / unit.secs);
    if (value >= 1) return `${value}${unit.label}`;
  }
  return "just now";
}

const Navbar = ({ onOpenCreatePost, currentUser }) => {
  const navigate = useNavigate();

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Dropdown states
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Counters & notification list
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const searchRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notifRef = useRef(null);

  const username = currentUser?.username || localStorage.getItem("username") || "user";
  const avatar = currentUser?.profileimg || "/media/blank-profile-picture.png";

  // Poll badges every 6 seconds
  const fetchBadges = async () => {
    try {
      const [msgRes, notifRes] = await Promise.all([
        api.get("/chats/unread-count/"),
        api.get("/notifications/unread-count/"),
      ]);
      if (typeof msgRes.data?.unread_count === "number") {
        setUnreadMsgCount(msgRes.data.unread_count);
      }
      if (typeof notifRes.data?.unread_count === "number") {
        setUnreadNotifCount(notifRes.data.unread_count);
      }
    } catch (err) {
      // Quiet fail if not logged in
    }
  };

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 6000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await api.get("/notifications/");
      if (res.data?.data) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  const handleToggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/mark-all-read/");
      setUnreadNotifCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read in background if unread
    if (!notif.is_read) {
      try {
        await api.post(`/notifications/${notif.id}/mark-read/`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadNotifCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error(err);
      }
    }

    setShowNotifications(false);

    // Redirect based on type
    if (notif.notification_type === "message") {
      navigate(`/chat?userId=${notif.sender_id}`);
    } else if (notif.notification_type === "follow") {
      navigate(`/profile/${notif.sender_username}`);
    } else {
      navigate(`/profile/${notif.sender_username}`);
    }
  };

  // Follow invitation accept / decline handlers inside notification
  const handleAcceptFollow = async (e, notif) => {
    e.stopPropagation();
    try {
      setActionLoadingId(notif.id);
      const res = await api.post(`/accounts/follow/accept/${notif.sender_id}/`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? {
                ...n,
                is_follow_pending: false,
                accepted: true,
                can_follow_back: res.data?.data?.can_follow_back ?? true,
                text: "accepted your follow invitation.",
              }
            : n
        )
      );
    } catch (err) {
      console.error("Failed to accept follow:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineFollow = async (e, notif) => {
    e.stopPropagation();
    try {
      setActionLoadingId(notif.id);
      await api.post(`/accounts/follow/decline/${notif.sender_id}/`);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? { ...n, is_follow_pending: false, declined: true }
            : n
        )
      );
    } catch (err) {
      console.error("Failed to decline follow:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFollowBack = async (e, notif) => {
    e.stopPropagation();
    try {
      setActionLoadingId(notif.id);
      await api.post("/accounts/follow/", { user_id: notif.sender_id });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? { ...n, can_follow_back: false, followed_back: true }
            : n
        )
      );
    } catch (err) {
      console.error("Failed to follow back:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get("/accounts/search/", {
          params: { q: searchQuery.trim() },
        });
        if (res.data?.data) {
          setSearchResults(res.data.data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      await api.post("/users/logout/", { refresh_token: refreshToken });
    } catch (err) {
      console.warn("Logout request:", err);
    } finally {
      clearTokens();
      navigate("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Link to="/home" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition transform">
                <svg className="w-6 h-6 text-slate-950 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                DVChat
              </span>
            </Link>
          </div>

          {/* Search Bar */}
          <div ref={searchRef} className="hidden sm:block flex-1 max-w-xs mx-4 relative">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
              />
              {isSearching && (
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg className="animate-spin h-3.5 w-3.5 text-teal-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              )}
            </div>

            {/* Search Dropdown */}
            {showDropdown && (
              <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50">
                {searchResults.length > 0 ? (
                  <div className="divide-y divide-slate-800">
                    {searchResults.map((user) => (
                      <Link
                        key={user.id}
                        to={`/profile/${user.username}`}
                        onClick={() => {
                          setShowDropdown(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center space-x-3 px-4 py-2.5 hover:bg-slate-800 transition"
                      >
                        <img
                          src={user.profileimg || "/media/blank-profile-picture.png"}
                          alt={user.username}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/media/blank-profile-picture.png";
                          }}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                        <div className="truncate">
                          <p className="text-sm font-semibold text-white truncate">@{user.username}</p>
                          {user.bio && <p className="text-xs text-gray-400 truncate">{user.bio}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-gray-400 text-center">
                    No users found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Links & Action Icons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Home Feed */}
            <Link
              to="/home"
              className="p-2 text-gray-300 hover:text-teal-400 rounded-xl hover:bg-slate-900 transition"
              title="Home Feed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>

            {/* Direct Messages Icon with Badge */}
            <Link
              to="/chat"
              className="p-2 text-gray-300 hover:text-teal-400 rounded-xl hover:bg-slate-900 transition relative"
              title="Messages"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {unreadMsgCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-teal-500 text-slate-950 font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                  {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                </span>
              )}
            </Link>

            {/* Notifications Bell Icon with Dropdown Drawer */}
            <div ref={notifRef} className="relative">
              <button
                onClick={handleToggleNotifications}
                className="p-2 text-gray-300 hover:text-teal-400 rounded-xl hover:bg-slate-900 transition relative focus:outline-none"
                title="Notifications"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                    {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                    <span className="text-sm font-bold text-white">Notifications</span>
                    {unreadNotifCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-teal-400 hover:text-teal-300 transition"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3.5 flex flex-col space-y-2 hover:bg-slate-800/70 transition cursor-pointer ${
                            !notif.is_read ? "bg-teal-500/5" : ""
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              src={notif.sender_profileimg || "/media/blank-profile-picture.png"}
                              alt={notif.sender_username}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/media/blank-profile-picture.png";
                              }}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0 text-xs">
                              <p className="text-gray-200">
                                <strong className="text-white">@{notif.sender_username}</strong>{" "}
                                {notif.declined
                                  ? "Follow invitation declined"
                                  : notif.accepted
                                  ? "You accepted their invitation"
                                  : notif.text}
                              </p>
                              <span className="text-[10px] text-gray-500">
                                {timeSince(notif.created_at)}
                              </span>
                            </div>
                            {!notif.is_read && (
                              <span className="w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                            )}
                          </div>

                          {/* Direct Follow invitation actions (Accept, Decline, Follow Back) */}
                          {notif.notification_type === "follow" && (
                            <div className="pl-12 flex items-center space-x-2 pt-1">
                              {notif.is_follow_pending && !notif.accepted && !notif.declined && (
                                <>
                                  <button
                                    onClick={(e) => handleAcceptFollow(e, notif)}
                                    disabled={actionLoadingId === notif.id}
                                    className="bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-3 py-1 rounded-lg text-[11px] transition"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={(e) => handleDeclineFollow(e, notif)}
                                    disabled={actionLoadingId === notif.id}
                                    className="bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium px-3 py-1 rounded-lg text-[11px] border border-slate-700 transition"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {(notif.accepted || (!notif.is_follow_pending && notif.can_follow_back)) && !notif.followed_back && (
                                <button
                                  onClick={(e) => handleFollowBack(e, notif)}
                                  disabled={actionLoadingId === notif.id}
                                  className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold px-3 py-1 rounded-lg text-[11px] transition shadow"
                                >
                                  Follow Back
                                </button>
                              )}

                              {notif.followed_back && (
                                <span className="text-[11px] text-teal-400 font-medium">
                                  ✓ Followed back
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Create Post Button */}
            {onOpenCreatePost && (
              <button
                onClick={onOpenCreatePost}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md shadow-teal-500/10 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>New Post</span>
              </button>
            )}

            {/* Profile Dropdown Menu */}
            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-1 rounded-full hover:ring-2 hover:ring-teal-400/50 transition focus:outline-none"
              >
                <img
                  src={avatar}
                  alt={username}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/media/blank-profile-picture.png";
                  }}
                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-sm font-bold text-white truncate">@{username}</p>
                  </div>

                  <Link
                    to={`/profile/${username}`}
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center space-x-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-800 transition"
                  >
                    <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/chat"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center space-x-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-800 transition"
                  >
                    <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Messages</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center space-x-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-slate-800 transition"
                  >
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Account & Face ID</span>
                  </Link>

                  <div className="border-t border-slate-800 my-1"></div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2.5 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 transition text-left"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
