import { useState, useRef } from "react";
import api from "../api/axios";

const CreatePostModal = ({ isOpen, onClose, onPostCreated, currentUser }) => {
  const [caption, setCaption] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim() && !imageFile) {
      setError("Please add a caption or an image for your post.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("caption", caption.trim());
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await api.post("/accounts/posts/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.status === "success" || response.data.data) {
        const createdPost = response.data.data || response.data;
        onPostCreated(createdPost);
        setCaption("");
        handleRemoveImage();
        onClose();
      }
    } catch (err) {
      console.error("Failed to create post:", err);
      setError(err.response?.data?.message || "Failed to share post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Create New Post</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1 rounded-full hover:bg-slate-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-sm p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl">
              {error}
            </div>
          )}

          {/* User Info */}
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
            <div>
              <p className="text-sm font-semibold text-white">@{currentUser?.username || "you"}</p>
              <p className="text-xs text-emerald-400">Public Post</p>
            </div>
          </div>

          {/* Caption Textarea */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's happening in your world?"
            rows="4"
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 focus:outline-none focus:border-teal-500 text-sm placeholder-gray-500 resize-none"
          />

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-slate-800 max-h-64 bg-black/50">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white p-1.5 rounded-full transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
                id="post-image-upload"
              />
              <label
                htmlFor="post-image-upload"
                className="cursor-pointer flex items-center space-x-2 text-sm text-teal-400 hover:text-teal-300 transition px-3 py-1.5 rounded-lg hover:bg-slate-800"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Add Photo</span>
              </label>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white transition disabled:opacity-50 shadow-md flex items-center space-x-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <span>{loading ? "Sharing..." : "Post"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
