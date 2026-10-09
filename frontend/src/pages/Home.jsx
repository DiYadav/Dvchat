import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// import api from "../api/axios";
// import Navbar from "../components/Navbar";

// ---------------------------------------------------------------------
// SCAFFOLD MODE
// ---------------------------------------------------------------------
// The backend endpoints for posts/suggestions/likes/comments don't
// exist yet, so this file ships with mock data below so the page is
// fully clickable and renders correctly on its own.
//
// Once your Django views are ready, do this:
//   1. Uncomment the `api` and `Navbar` imports above.
//   2. Replace `fetchFeed()` in the Home component with real calls,
//      e.g.:
//        const [postsRes, suggestionsRes] = await Promise.all([
//          api.get("/posts/"),
//          api.get("/suggestions/"),
//        ]);
//        setPosts(postsRes.data.data);
//        setSuggestions(suggestionsRes.data.data);
//   3. Replace the mock handleLike / handleAddComment bodies inside
//      PostCard with real api.get("/like-post/", ...) and
//      api.post(`/add-comment/${post.id}/`, ...) calls (already
//      sketched in the comments below each mock).
//   4. Delete the MOCK_POSTS / MOCK_SUGGESTIONS / MOCK_CURRENT_USER
//      constants and this whole banner.
// ---------------------------------------------------------------------

const MOCK_CURRENT_USER = {
  username: "you",
  profileimg: "https://i.pravatar.cc/80?img=12",
};

const MOCK_POSTS = [
  {
    id: 1,
    user: { username: "aria_codes" },
    profile_user: "https://i.pravatar.cc/80?img=5",
    image: "https://picsum.photos/seed/post1/800/600",
    caption: "Shipping something new today 🚀",
    is_liked: false,
    no_of_likes: 12,
    comments: [
      {
        id: 101,
        user: {
          username: "devon",
          profile: { profileimg: "https://i.pravatar.cc/80?img=8" },
        },
        text: "Looks great!",
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 2,
    user: { username: "maya.k" },
    profile_user: "https://i.pravatar.cc/80?img=32",
    image: "https://picsum.photos/seed/post2/800/600",
    caption: "Weekend hike 🌲",
    is_liked: true,
    no_of_likes: 34,
    comments: [],
  },
];

const MOCK_SUGGESTIONS = [
  {
    id: 1,
    user: "sam.codes",
    profileimg: "https://i.pravatar.cc/80?img=15",
    bio: "Frontend dev, coffee addict",
  },
  {
    id: 2,
    user: "lena_r",
    profileimg: "https://i.pravatar.cc/80?img=47",
    bio: "Designer & illustrator",
  },
];
// ---------------------------------------------------------------------

// Rough client-side equivalent of Django's `timesince` filter.
function timeSince(dateString) {
  if (!dateString) return "";

  const seconds = Math.floor(
    (Date.now() - new Date(dateString).getTime()) / 1000
  );

  const units = [
    { label: "y", secs: 31536000 },
    { label: "mo", secs: 2592000 },
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

function PostCard({ post, currentUser, onLikeToggled, onCommentAdded }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(false);

  const comments = [...(post.comments || [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const handleLike = async () => {
    if (liking) return;

    try {
      setLiking(true);

      // MOCK: flips the like locally. Swap for:
      //   const response = await api.get("/like-post/", { params: { post_id: post.id } });
      //   if (response.data.status === "success") onLikeToggled(post.id, response.data.data);
      const nextLiked = !post.is_liked;
      onLikeToggled(post.id, {
        is_liked: nextLiked,
        no_of_likes: post.no_of_likes + (nextLiked ? 1 : -1),
      });
    } finally {
      setLiking(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!commentText.trim() || posting) return;

    try {
      setPosting(true);

      // MOCK: appends the comment locally. Swap for:
      //   const response = await api.post(`/add-comment/${post.id}/`, { comment_text: commentText });
      //   if (response.data.status === "success") onCommentAdded(post.id, response.data.data);
      onCommentAdded(post.id, {
        id: Date.now(),
        user: {
          username: currentUser.username,
          profile: { profileimg: currentUser.profileimg },
        },
        text: commentText,
        created_at: new Date().toISOString(),
      });
      setCommentText("");
    } finally {
      setPosting(false);
    }
  };

  const likeLabel =
    post.no_of_likes === 0
      ? "No likes"
      : post.no_of_likes === 1
      ? "Liked by 1 person"
      : `Liked by ${post.no_of_likes} people`;

  return (
    <div className="bg-slate-900 rounded-2xl shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <Link
            to={
              post.user?.username
                ? `/profile/${post.user.username}`
                : "#"
            }
          >
            <img
              src={post.profile_user}
              alt={post.user?.username}
              className="w-10 h-10 rounded-full object-cover"
            />
          </Link>
          <span className="font-semibold text-white">
            @{post.user?.username}
          </span>
        </div>
        <button className="text-gray-400 hover:text-gray-200">...</button>
      </div>

      {/* Post Image */}
      {post.image ? (
        <img
          src={post.image}
          alt="Post"
          className="w-full h-[450px] object-cover"
        />
      ) : (
        <img
          src="/static/assets/images/posts/default-post.jpg"
          alt="Post"
          className="w-full"
        />
      )}

      {/* Post Body */}
      <div className="px-4 py-3 space-y-6">
        {/* Like, Comment, Download */}
        <div className="flex items-center w-[300px] space-x-4">
          <button
            onClick={handleLike}
            disabled={liking}
            className="flex items-center space-x-1 group disabled:opacity-60"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={post.is_liked ? "red" : "none"}
              stroke={post.is_liked ? "red" : "currentColor"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white transition-colors duration-300"
            >
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <span
              className={`text-sm ${
                post.is_liked ? "text-white" : "text-gray-400"
              }`}
            >
              {likeLabel}
            </span>
          </button>

          <button
            onClick={() => setShowComments((v) => !v)}
            className="text-white text-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
          </button>

          {post.image ? (
            <a
              href={post.image}
              download
              className="ml-auto text-gray-500"
            >
              ⬇️
            </a>
          ) : (
            <span className="ml-auto text-gray-500 cursor-not-allowed opacity-50">
              ⬇️
            </span>
          )}
        </div>

        {/* Caption */}
        <div className="text-sm text-white">
          <strong>{post.user?.username}</strong> {post.caption}
        </div>

        {/* Comment Section */}
        {showComments && (
          <div>
            {/* All Comments Scrollable */}
            <div className="max-h-60 overflow-y-auto scrollbar-hide pr-2 space-y-3 mt-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start space-x-3 text-sm"
                >
                  <Link
                    to={`/profile/${comment.user.username}`}
                    className="flex-shrink-0"
                  >
                    <img
                      src={
                        comment.user?.profile?.profileimg ||
                        "/static/blank-profile-picture.png"
                      }
                      alt={`${comment.user.username}'s profile`}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  </Link>
                  <div className="w-[800px] text-white p-2 rounded">
                    <strong className="text-blue-500">
                      @{comment.user.username}
                    </strong>{" "}
                    {comment.text}
                    <p className="text-xs text-gray-400 mt-1">
                      {timeSince(comment.created_at)} ago
                    </p>
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <p className="text-white/40 text-xs">
                  No comments yet. Be the first to say something.
                </p>
              )}
            </div>

            {/* Comment Input Box */}
            {currentUser && (
              <form onSubmit={handleAddComment} className="relative mt-4">
                <div className="flex items-center space-x-2">
                  <img
                    src={currentUser.profileimg}
                    alt="Your profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <input
                    type="text"
                    name="comment_text"
                    placeholder="Post a comment"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full rounded-2xl px-3 py-2 text-sm bg-slate-800 text-white"
                    required
                  />
                  <button
                    type="submit"
                    disabled={posting}
                    className="text-sm text-white bg-blue-500 px-3 py-1 rounded-xl hover:bg-blue-600 disabled:opacity-50"
                  >
                    {posting ? "..." : "Post"}
                  </button>
                </div>
              </form>
            )}
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

  const fetchFeed = async () => {
    setLoading(true);

    // MOCK: replace this block with the real api.get() calls once the
    // backend exists (see the banner comment at the top of this file).
    await new Promise((resolve) => setTimeout(resolve, 300));
    setPosts(MOCK_POSTS);
    setSuggestions(MOCK_SUGGESTIONS);
    setCurrentUser(MOCK_CURRENT_USER);

    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLikeToggled = (postId, data) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: data.is_liked, no_of_likes: data.no_of_likes }
          : p
      )
    );
  };

  const handleCommentAdded = (postId, newComment) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [...(p.comments || []), newComment] }
          : p
      )
    );
  };

  // Posts render newest-first, mirroring `{% for post in posts reversed %}`.
  const orderedPosts = [...posts].reverse();

  return (
    <div className="bg-black font-sans min-h-screen">
      <div className="flex">
        {/* <Navbar /> */}
        <div className="w-56 shrink-0 border-r border-slate-800 p-4 text-white/40 text-xs">
          Navbar placeholder — send navbar.html and I'll build the real one.
        </div>

        <div className="flex-1 container mx-auto p-4">
          <h1 className="text-2xl text-white font-bold mb-4">Feeds</h1>

          <div className="lg:flex lg:space-x-8">
            {/* Left: Posts */}
            <div className="lg:w-7/12 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide pr-2">
              {loading && (
                <p className="text-white/60 text-sm">Loading feed...</p>
              )}

              {!loading && orderedPosts.length === 0 && (
                <p className="text-white/60 text-sm">
                  No posts yet. Follow people to see their posts here.
                </p>
              )}

              {orderedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onLikeToggled={handleLikeToggled}
                  onCommentAdded={handleCommentAdded}
                />
              ))}
            </div>

            {/* Right: Suggestions */}
            <div className="lg:w-5/12">
              <div className="bg-slate-800 rounded-xl shadow">
                <div className="border-b border-slate-700 px-6 py-4 flex justify-between items-center">
                  <h2 className="text-white text-lg font-semibold">
                    Users You Can Follow
                  </h2>
                  <button
                    onClick={fetchFeed}
                    className="text-blue-500 text-sm hover:text-blue-400"
                  >
                    Refresh
                  </button>
                </div>
                <div className="divide-y divide-slate-700">
                  {suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div className="flex text-white items-center space-x-3">
                        <Link to={`/profile/${suggestion.user}`}>
                          <img
                            src={suggestion.profileimg}
                            alt={suggestion.user}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        </Link>
                        <div>
                          <p className="font-semibold">{suggestion.user}</p>
                          <p className="text-sm text-white/70">
                            {suggestion.bio}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/profile/${suggestion.user}`}
                        className="border border-white/30 px-3 py-1 rounded text-sm text-white hover:bg-pink-600 hover:border-pink-600 transition"
                      >
                        View
                      </Link>
                    </div>
                  ))}

                  {suggestions.length === 0 && (
                    <p className="text-white/50 text-sm px-6 py-4">
                      No suggestions right now.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
