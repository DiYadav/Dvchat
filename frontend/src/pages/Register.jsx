import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");

  // Optional Face Enrollment
  const [enrollFaceNow, setEnrollFaceNow] = useState(false);
  const [faceImageBase64, setFaceImageBase64] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Manage camera lifecycle cleanly
  useEffect(() => {
    let stream = null;
    let isCancelled = false;

    if (cameraActive) {
      const initCamera = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setMessage("Camera API is not supported in this browser (requires HTTPS or localhost).");
          setCameraActive(false);
          return;
        }

        try {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
              audio: false,
            });
          } catch (e) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setMessage("Camera access was blocked. Please allow camera permissions in your browser address bar.");
          } else {
            setMessage(`Unable to access camera: ${err.message || "Unknown error"}`);
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

  const captureFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setFaceImageBase64(dataUrl);
    setCameraActive(false);
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setMessage("");

    if (!username.trim() || !email.trim() || !password1 || !password2) {
      setMessage("All registration fields are required.");
      return;
    }

    if (password1 !== password2) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        username: username.trim(),
        email: email.trim(),
        password1,
        password2,
      };

      if (enrollFaceNow && faceImageBase64) {
        payload.face_image = faceImageBase64;
      }

      const response = await api.post("/users/register/", payload);

      if (response.data.status === "success") {
        setIsSuccess(true);
        setMessage("Account created successfully! Redirecting to login...");

        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setMessage(response.data.message || "Registration failed.");
      }
    } catch (error) {
      console.error("Registration error:", error);
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        setMessage(Object.values(errors).flat().join(" "));
      } else {
        setMessage(error.response?.data?.message || "Registration failed. Try a different username or email.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a0c1e] via-[#091017] to-[#0c1a17] relative p-4">
      {/* Background glow */}
      <div className="absolute -left-24 bottom-0 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-24 top-0 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

      {/* Register Card */}
      <div className="relative z-10 w-full max-w-[440px] px-8 py-8 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <svg className="w-7 h-7 text-slate-950 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-wide">
            Join <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">DVChat</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">Create an account to start sharing and connecting</p>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`mb-4 text-xs p-3 rounded-xl border text-center ${
              isSuccess
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/15 border-red-500/30 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-3.5">
          {/* Username */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              placeholder="choose_a_username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
              required
            />
          </div>

          {/* Optional Face Recognition Checkbox */}
          <div className="pt-1">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={enrollFaceNow}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setEnrollFaceNow(checked);
                  if (checked) {
                    setCameraActive(true);
                  } else {
                    setCameraActive(false);
                    setFaceImageBase64(null);
                  }
                }}
                className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
              />
              <span className="text-xs text-gray-300">
                Enroll Face Recognition now (Optional)
              </span>
            </label>
          </div>

          {/* Face Capture Section if checked */}
          {enrollFaceNow && (
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <canvas ref={canvasRef} className="hidden" />

              {!faceImageBase64 ? (
                <>
                  {!cameraActive ? (
                    <button
                      type="button"
                      onClick={() => setCameraActive(true)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-semibold py-2 rounded-lg transition"
                    >
                      Start Camera to Snap Face
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border border-teal-500/50 h-40 bg-black flex items-center justify-center">
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={captureFace}
                          className="flex-1 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold py-1.5 rounded-lg text-xs transition"
                        >
                          Snap Face
                        </button>
                        <button
                          type="button"
                          onClick={() => setCameraActive(false)}
                          className="px-3 bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs rounded-lg transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <img src={faceImageBase64} alt="Captured" className="w-10 h-10 rounded-lg object-cover border border-emerald-500" />
                    <span className="text-xs text-emerald-400 font-semibold">Face captured!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFaceImageBase64(null);
                      setCameraActive(true);
                    }}
                    className="text-xs text-gray-400 hover:text-white underline"
                  >
                    Retake
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition duration-200 disabled:opacity-50 shadow-lg shadow-teal-500/20 text-sm tracking-wide mt-3"
          >
            {loading ? "CREATING ACCOUNT..." : "REGISTER"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-gray-500 font-semibold tracking-wider">
              Already have an account?
            </span>
          </div>
        </div>

        {/* Login Link */}
        <Link
          to="/login"
          className="w-full flex items-center justify-center py-2.5 bg-slate-950 hover:bg-slate-800 text-gray-200 font-semibold rounded-xl text-xs border border-slate-800 hover:border-slate-700 transition tracking-wider"
        >
          SIGN IN INSTEAD
        </Link>
      </div>
    </div>
  );
}

export default Register;
