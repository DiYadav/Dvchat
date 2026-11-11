import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";

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
    if (value >= 1) return `${value}${unit.label} ago`;
  }
  return "just now";
}

const Chat = () => {
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const targetConversationId = searchParams.get("conversationId");

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load current user profile
  useEffect(() => {
    api.get("/accounts/profile/")
      .then((res) => {
        if (res.data?.data) setCurrentUser(res.data.data);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const res = await api.get("/chats/conversations/");
      if (res.data?.data) {
        setConversations(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
    return [];
  };

  // If redirected with ?userId=... or ?conversationId=...
  useEffect(() => {
    const initChat = async () => {
      const convos = await fetchConversations();

      if (targetConversationId) {
        const match = convos.find((c) => String(c.id) === String(targetConversationId));
        if (match) {
          setActiveConversation(match);
          return;
        }
      }

      if (targetUserId) {
        try {
          const res = await api.post(`/chats/start/${targetUserId}/`);
          if (res.data?.data) {
            const started = res.data.data;
            setActiveConversation(started);
            fetchConversations();
          }
        } catch (err) {
          console.error("Failed to start chat with target user:", err);
        }
      } else if (convos.length > 0 && !activeConversation) {
        setActiveConversation(convos[0]);
      }
    };

    initChat();
  }, [targetUserId, targetConversationId]);

  // Fetch messages for active conversation
  const fetchMessages = async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await api.get(`/chats/conversations/${conversationId}/messages/`);
      if (res.data?.data) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation?.id]);

  // Periodic polling for incoming messages (every 3.5 seconds)
  useEffect(() => {
    if (!activeConversation) return;

    const interval = setInterval(() => {
      fetchMessages(activeConversation.id);
      fetchConversations();
    }, 3500);

    return () => clearInterval(interval);
  }, [activeConversation?.id]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeConversation || (!messageText.trim() && !imageFile)) return;

    try {
      setSending(true);
      const formData = new FormData();
      if (messageText.trim()) formData.append("text", messageText.trim());
      if (imageFile) formData.append("image", imageFile);

      const res = await api.post(
        `/chats/conversations/${activeConversation.id}/messages/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.data) {
        setMessages((prev) => [...prev, res.data.data]);
        setMessageText("");
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchConversations();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.other_user?.username?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex">
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[82vh]">
          {/* Left Panel: Conversations List */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-950/60">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-white">Messages</h2>
                <span className="text-xs text-teal-400 font-medium bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20">
                  {conversations.length} Active
                </span>
              </div>
              <input
                type="text"
                placeholder="Search chats..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {loadingConversations ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  {searchFilter ? "No conversations found." : "No messages yet. Visit a profile to start chatting!"}
                </div>
              ) : (
                filteredConversations.map((convo) => {
                  const isSelected = activeConversation?.id === convo.id;
                  const other = convo.other_user;
                  return (
                    <button
                      key={convo.id}
                      onClick={() => setActiveConversation(convo)}
                      className={`w-full p-4 flex items-center space-x-3 text-left transition ${
                        isSelected
                          ? "bg-slate-800/90 border-l-4 border-teal-400 shadow-inner"
                          : "hover:bg-slate-900/80"
                      }`}
                    >
                      <img
                        src={other?.profileimg || "/media/blank-profile-picture.png"}
                        alt={other?.username || "user"}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/media/blank-profile-picture.png";
                        }}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-700 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-white truncate">
                            @{other?.username || "unknown"}
                          </p>
                          {convo.last_message && (
                            <span className="text-[10px] text-gray-400 ml-1">
                              {timeSince(convo.last_message.timestamp)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {convo.last_message?.text || "Started a chat"}
                        </p>
                      </div>

                      {convo.unread_count > 0 && (
                        <span className="w-5 h-5 bg-teal-500 text-slate-950 font-bold text-[10px] rounded-full flex items-center justify-center flex-shrink-0 shadow-md animate-pulse">
                          {convo.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Chat Stream & Message Input */}
          <div className="flex-1 flex flex-col bg-slate-900">
            {activeConversation ? (
              <>
                {/* Active Chat Header */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <div className="flex items-center space-x-3">
                    <img
                      src={activeConversation.other_user?.profileimg || "/media/blank-profile-picture.png"}
                      alt={activeConversation.other_user?.username}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/media/blank-profile-picture.png";
                      }}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                    />
                    <div>
                      <Link
                        to={`/profile/${activeConversation.other_user?.username}`}
                        className="font-bold text-white hover:text-teal-400 text-sm transition"
                      >
                        @{activeConversation.other_user?.username}
                      </Link>
                      <p className="text-xs text-emerald-400 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Active Now</span>
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/profile/${activeConversation.other_user?.username}`}
                    className="text-xs text-teal-400 hover:text-teal-300 font-medium px-3.5 py-1.5 rounded-xl border border-teal-500/20 hover:bg-slate-800 transition"
                  >
                    View Profile
                  </Link>
                </div>

                {/* Messages Bubbles: Mine on RIGHT, Receiver on LEFT */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-gray-500 text-xs">
                      <div className="w-12 h-12 bg-slate-800 text-teal-400 rounded-full flex items-center justify-center text-xl">
                        👋
                      </div>
                      <p>Send a message to say hello to @{activeConversation.other_user?.username}!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      // Determine if message is sent by logged-in user
                      const isMe =
                        msg.is_me === true ||
                        (currentUser && msg.sender_id === currentUser.id) ||
                        (currentUser && msg.sender_username === currentUser.username) ||
                        msg.sender_username === localStorage.getItem("username");

                      return (
                        <div
                          key={msg.id}
                          className={`w-full flex ${isMe ? "justify-end" : "justify-start"} my-1.5`}
                        >
                          {/* Receiver avatar on left */}
                          {!isMe && (
                            <Link to={`/profile/${msg.sender_username}`}>
                              <img
                                src={
                                  msg.sender_profileimg ||
                                  activeConversation.other_user?.profileimg ||
                                  "/media/blank-profile-picture.png"
                                }
                                alt={msg.sender_username}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "/media/blank-profile-picture.png";
                                }}
                                className="w-7 h-7 rounded-full object-cover mr-2 self-end mb-1 border border-slate-700 flex-shrink-0 hover:ring-2 hover:ring-teal-400 transition"
                              />
                            </Link>
                          )}

                          <div
                            className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${
                              isMe ? "items-end" : "items-start"
                            }`}
                          >
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm shadow-md ${
                                isMe
                                  ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-br-none"
                                  : "bg-slate-800 border border-slate-700/60 text-gray-100 rounded-bl-none"
                              }`}
                            >
                              {msg.image && (
                                <a href={msg.image} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={msg.image}
                                    alt="attachment"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = "none";
                                    }}
                                    className="rounded-xl max-h-64 w-full object-contain mb-2 bg-black/40 cursor-pointer hover:opacity-90 transition"
                                  />
                                </a>
                              )}
                              {msg.text && (
                                <p className="whitespace-pre-line leading-relaxed text-sm">
                                  {msg.text}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-[10px] mt-1 px-1 ${
                                isMe ? "text-teal-200/70" : "text-gray-400"
                              }`}
                            >
                              {timeSince(msg.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Image Preview before sending */}
                {imagePreview && (
                  <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center space-x-3">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-12 h-12 object-cover rounded-lg border border-teal-500"
                    />
                    <span className="text-xs text-gray-300 flex-1 truncate">Image ready to send</span>
                    <button
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Input Bar */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center space-x-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                    id="chat-image-input"
                  />
                  <label
                    htmlFor="chat-image-input"
                    className="p-2 text-gray-400 hover:text-teal-400 cursor-pointer rounded-xl hover:bg-slate-800 transition"
                    title="Send a photo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </label>

                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
                  />

                  <button
                    type="submit"
                    disabled={sending || (!messageText.trim() && !imageFile)}
                    className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 disabled:opacity-40 text-white font-bold p-2.5 rounded-xl transition shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 space-y-3">
                <div className="w-16 h-16 bg-slate-800 text-teal-400 rounded-3xl flex items-center justify-center text-2xl shadow-lg">
                  💬
                </div>
                <h3 className="text-lg font-bold text-white">Your Direct Messages</h3>
                <p className="text-xs text-gray-400 max-w-sm">
                  Select a chat on the left or search for a user to start a conversation.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;
