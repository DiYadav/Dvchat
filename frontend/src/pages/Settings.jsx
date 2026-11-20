import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import Navbar from "../components/Navbar";

const Settings = () => {
  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'face'
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile Form state
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState("");
  const [privacyLoading, setPrivacyLoading] = useState(false);

  // Delete Account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Face Settings state
  const [faceStatus, setFaceStatus] = useState({
    has_face_registered: false,
    is_face_login_enabled: false,
  });
  const [faceMsg, setFaceMsg] = useState("");
  const [faceError, setFaceError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch initial profile & face status
  const loadSettingsData = async () => {
    try {
      setLoading(true);
      const [profileRes, faceRes] = await Promise.all([
        api.get("/accounts/profile/"),
        api.get("/accounts/profile/face-settings/"),
      ]);

      if (profileRes.data?.data) {
        const u = profileRes.data.data;
        setCurrentUser(u);
        setBio(u.bio || "");
        setLocation(u.location || "");
        setProfileImagePreview(u.profileimg || null);
        setIsPrivate(u.is_private || false);
      }

      if (faceRes.data?.data) {
        setFaceStatus(faceRes.data.data);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  // Dedicated effect to manage camera stream lifecycle
  useEffect(() => {
    let stream = null;
    let isCancelled = false;

    if (cameraActive) {
      const initCamera = async () => {
        setFaceError("");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setFaceError(
            "Camera API is not supported in this browser (requires HTTPS or localhost).",
          );
          setCameraActive(false);
          return;
        }

        try {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 },
              },
              audio: false,
            });
          } catch (e) {
            console.warn("Fallback to generic video constraint:", e);
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }

          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;

          if (videoRef.current) {
            const video = videoRef.current;
            video.srcObject = stream;
            video.setAttribute("playsinline", "true");
            video.muted = true;
            video.onloadedmetadata = () => {
              video.play().catch(console.error);
            };
          }
        } catch (err) {
          console.error("Camera access error:", err);
          if (
            err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError"
          ) {
            setFaceError(
              "Camera access denied. Please allow camera permissions in your browser address bar.",
            );
          } else if (
            err.name === "NotFoundError" ||
            err.name === "DevicesNotFoundError"
          ) {
            setFaceError("No camera device detected on your system.");
          } else if (err.name === "NotReadableError") {
            setFaceError(
              "Camera is currently in use by another app. Please close other camera apps and retry.",
            );
          } else {
            setFaceError(`Camera error: ${err.message || "Unknown error"}`);
          }
          setCameraActive(false);
        }
      };

      initCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraActive]);

  // Profile Save
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setProfileLoading(true);
      setProfileMsg("");

      const formData = new FormData();
      formData.append("bio", bio);
      formData.append("location", location);
      if (profileImageFile) {
        formData.append("profileimg", profileImageFile);
      }

      const res = await api.patch("/accounts/profile/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.status === "success") {
        setProfileMsg("Profile updated successfully!");
        setCurrentUser(res.data.data);
      }
    } catch (err) {
      console.error("Profile update failed:", err);
      setProfileMsg("Failed to update profile. Please try again.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };
  
  const handleDeleteProfileImage = async () => {
  try {
    const response = await api.delete("/accounts/profile/");

    console.log("Profile image deleted:", response.data);

    // Reset preview to default image
    setProfileImagePreview(null);

    // Refresh profile data
    await fetchProfile();

  } catch (error) {
    console.error(
      "Failed to delete profile image:",
      error.response?.data || error
    );
  }
};

  // Face Recognition Capture & Enroll
  const handleCaptureFace = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setFaceError("Camera is initializing. Please wait a moment.");
      return;
    }

    try {
      setCapturing(true);
      setFaceMsg("");
      setFaceError("");

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const faceBase64 = canvas.toDataURL("image/jpeg", 0.9);

      const res = await api.post("/accounts/profile/face-settings/", {
        face_image: faceBase64,
      });

      if (res.data?.status === "success") {
        setFaceStatus({
          has_face_registered: true,
          is_face_login_enabled: true,
        });
        setFaceMsg(
          "Face successfully enrolled! You can now log in using your face.",
        );
        setCameraActive(false);
      }
    } catch (err) {
      console.error("Face registration failed:", err);
      setFaceError(
        err.response?.data?.message ||
          "No face detected or enrollment failed. Try again with clear lighting.",
      );
    } finally {
      setCapturing(false);
    }
  };

  // Toggle Face Login on/off
  const handleToggleFaceLogin = async (e) => {
    const nextVal = e.target.checked;
    try {
      setFaceError("");
      const res = await api.patch("/accounts/profile/face-settings/", {
        is_face_login_enabled: nextVal,
      });
      if (res.data?.status === "success") {
        setFaceStatus((prev) => ({ ...prev, is_face_login_enabled: nextVal }));
        setFaceMsg(res.data.message);
      }
    } catch (err) {
      console.error("Toggle face login failed:", err);
      setFaceError(
        err.response?.data?.message || "Could not toggle face login.",
      );
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== currentUser?.username) {
      setDeleteError(
        `Type your exact username "@${currentUser?.username}" to confirm.`,
      );
      return;
    }
    if (!deletePassword) {
      setDeleteError("Please enter your password to confirm.");
      return;
    }
    try {
      setDeleteLoading(true);
      setDeleteError("");
      await api.post("/accounts/delete-account/", { password: deletePassword });
      // Clear tokens and redirect to login
      localStorage.clear();
      window.location.href = "/login";
    } catch (err) {
      setDeleteError(
        err.response?.data?.message ||
          "Failed to delete account. Please check your password.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Delete Face Data
  const handleDeleteFaceData = async () => {
    if (
      !window.confirm(
        "Are you sure you want to remove your facial recognition data?",
      )
    )
      return;
    try {
      setFaceError("");
      const res = await api.delete("/accounts/profile/face-settings/");
      if (res.data?.status === "success") {
        setFaceStatus({
          has_face_registered: false,
          is_face_login_enabled: false,
        });
        setFaceMsg("Face recognition data deleted.");
        setCameraActive(false);
      }
    } catch (err) {
      console.error("Delete face data failed:", err);
      setFaceError("Could not delete face data.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      <Navbar currentUser={currentUser} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Account Settings
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your personal profile and configure optional facial
            recognition login.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-6 text-sm">
          <button
            onClick={() => {
              setActiveTab("profile");
              setCameraActive(false);
            }}
            className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
              activeTab === "profile"
                ? "border-teal-400 text-teal-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab("face")}
            className={`pb-3 font-semibold transition border-b-2 flex items-center space-x-2 ${
              activeTab === "face"
                ? "border-teal-400 text-teal-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Face Recognition ID</span>
          </button>
        </div>

        {/* Tab 1: Profile Details */}
        {activeTab === "profile" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            {profileMsg && (
              <div className="mb-6 p-4 rounded-xl text-sm bg-teal-500/10 border border-teal-500/30 text-teal-300">
                {profileMsg}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Profile Image Picker */}
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <img
                  src={
                    profileImagePreview || "/media/blank-profile-picture.png"
                  }
                  alt="avatar"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-700"
                />
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleProfileImageChange}
                    accept="image/*"
                    className="hidden"
                    id="avatar-upload"
                  />
                  <div className="flex flex-wrap gap-2">
                  <label
                    htmlFor="avatar-upload"
                    className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-teal-400 font-semibold px-4 py-2 rounded-xl text-xs border border-slate-700 transition"
                  >
                    Change Profile
                  </label>

                  {/* Remove Profile Button */}
                  <button
                    type="button"
                    onClick={handleDeleteProfileImage}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition"
                  >
                    Remove Profile
                  </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, PNG or GIF, max 5MB.
                  </p>
                </div>
              </div>

              {/* Username (Read Only) */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">
                  Username
                </label>
                <input
                  type="text"
                  value={currentUser?.username || ""}
                  disabled
                  className="w-full bg-slate-950/50 border border-slate-800 text-gray-400 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about yourself..."
                  rows="3"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3.5 text-sm focus:outline-none focus:border-teal-500 transition resize-none"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500 transition"
                />
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Private Account
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Only approved followers can see your posts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const newVal = !isPrivate;
                    setIsPrivate(newVal);
                    setPrivacyLoading(true);
                    setPrivacyMsg("");
                    try {
                      await api.patch("/accounts/profile/", {
                        is_private: newVal,
                      });
                      setPrivacyMsg(
                        newVal
                          ? "Account set to private."
                          : "Account set to public.",
                      );
                    } catch (err) {
                      setIsPrivate(!newVal);
                      setPrivacyMsg("Failed to update privacy setting.");
                    } finally {
                      setPrivacyLoading(false);
                      setTimeout(() => setPrivacyMsg(""), 3000);
                    }
                  }}
                  disabled={privacyLoading}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${isPrivate ? "bg-teal-500" : "bg-slate-700"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isPrivate ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
              {privacyMsg && (
                <p
                  className={`text-xs ${privacyMsg.includes("Failed") ? "text-rose-400" : "text-teal-400"}`}
                >
                  {privacyMsg}
                </p>
              )}

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition shadow-lg shadow-teal-500/10 disabled:opacity-50"
                >
                  {profileLoading ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Face Recognition ID */}
        {activeTab === "face" && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Face Recognition Authentication
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Use your webcam to register your face for fast, passwordless
                biometric login.
              </p>
            </div>

            {faceMsg && (
              <div className="p-4 rounded-xl text-sm bg-teal-500/10 border border-teal-500/30 text-teal-300">
                {faceMsg}
              </div>
            )}

            {faceError && (
              <div className="p-4 rounded-xl text-sm bg-red-500/10 border border-red-500/30 text-red-300">
                {faceError}
              </div>
            )}

            {/* Current Status Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      faceStatus.has_face_registered
                        ? "bg-emerald-400"
                        : "bg-gray-500"
                    }`}
                  />
                  <p className="font-semibold text-white text-sm">
                    {faceStatus.has_face_registered
                      ? "Face Enrolled"
                      : "No Face Enrolled"}
                  </p>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {faceStatus.has_face_registered
                    ? "Your facial encoding vector is saved securely."
                    : "Register your face to enable instant face-based logins."}
                </p>
              </div>

              {faceStatus.has_face_registered && (
                <div className="flex items-center space-x-3">
                  <label className="text-xs text-gray-300 font-medium">
                    Enable Face Login:
                  </label>
                  <input
                    type="checkbox"
                    checked={faceStatus.is_face_login_enabled}
                    onChange={handleToggleFaceLogin}
                    className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Webcam Live Enrollment Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                {faceStatus.has_face_registered
                  ? "Update Registered Face"
                  : "Enroll Face Now"}
              </h3>

              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => setCameraActive(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-teal-400 font-semibold px-5 py-2.5 rounded-xl text-sm border border-slate-700 transition flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Open Camera to Register Face</span>
                </button>
              ) : (
                <div className="space-y-4 max-w-md">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-teal-500/40 bg-black aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-2 border-dashed border-teal-400/30 rounded-2xl pointer-events-none m-4 flex items-center justify-center">
                      <span className="text-teal-200/60 text-xs bg-black/60 px-3 py-1 rounded-full">
                        Look straight into camera
                      </span>
                    </div>
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleCaptureFace}
                      disabled={capturing}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-50 shadow-md flex items-center justify-center space-x-2"
                    >
                      {capturing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Analyzing Face...</span>
                        </>
                      ) : (
                        <span>Capture & Save Face</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCameraActive(false)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-sm transition"
                    >
                      Close Camera
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone: Delete Face Data */}
            {faceStatus.has_face_registered && (
              <div className="pt-6 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleDeleteFaceData}
                  className="text-xs text-red-400 hover:text-red-300 hover:underline flex items-center space-x-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Remove Registered Facial Data</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Danger Zone — always visible */}
        <div className="bg-slate-900 border border-red-900/40 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <svg
              className="w-5 h-5 text-red-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h2 className="text-base font-bold text-red-400">Danger Zone</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-950 border border-red-900/30 rounded-2xl">
            <div>
              <p className="text-sm font-semibold text-white">
                Delete My Account
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Permanently delete your account, all posts, messages, and
                followers. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-shrink-0 flex items-center space-x-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 font-semibold px-4 py-2.5 rounded-xl text-sm border border-red-600/30 hover:border-red-500/50 transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </main>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-red-900/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            {/* Header */}
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Account</h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  This action is{" "}
                  <span className="text-red-400 font-semibold">
                    permanent and irreversible
                  </span>
                  . All your posts, followers, messages, and data will be
                  deleted forever.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
                {deleteError}
              </div>
            )}

            {/* Confirm username */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">
                Type your username to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  setDeleteError("");
                }}
                placeholder={`@${currentUser?.username}`}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">
                Enter your password
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeleteError("");
                }}
                placeholder="Your current password"
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500 transition"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-1">
              <button
                onClick={handleDeleteAccount}
                disabled={
                  deleteLoading ||
                  deleteConfirmText !== currentUser?.username ||
                  !deletePassword
                }
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center space-x-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span>Permanently Delete My Account</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteConfirmText("");
                  setDeleteError("");
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-xl text-sm transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
