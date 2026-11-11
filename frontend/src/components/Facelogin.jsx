import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { saveTokens } from "../auth/TokenService";

const FaceLogin = ({ username, onSuccess, onBack }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      setMessage("");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (isMounted) {
          setMessage("Camera API is not supported in this browser or environment (requires localhost or HTTPS).");
        }
        return;
      }

      try {
        let stream;
        try {
          // Attempt with ideal resolution & user facing
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
        } catch (constraintErr) {
          console.warn("Retrying camera with generic constraints:", constraintErr);
          // Fallback for desktop/USB webcams that don't support facingMode
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.setAttribute("playsinline", "true");
          video.muted = true;
          video.onloadedmetadata = async () => {
            try {
              await video.play();
              if (isMounted) setCameraReady(true);
            } catch (playErr) {
              console.error("Video play failed:", playErr);
            }
          };
        }
      } catch (error) {
        console.error("Camera access error:", error);
        if (isMounted) {
          if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            setMessage("Camera access was blocked. Please click the camera icon in your browser address bar to allow permissions.");
          } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
            setMessage("No camera device found on your computer.");
          } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
            setMessage("Camera is currently in use by another application. Please close it and retry.");
          } else {
            setMessage(`Unable to access camera: ${error.message || "Unknown error"}`);
          }
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleFaceLogin = async () => {
    if (!username || !username.trim()) {
      setMessage("Please enter your username first.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setMessage("Camera not available.");
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setMessage("Camera is still warming up. Please wait 2 seconds and click again.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const faceImage = canvas.toDataURL("image/jpeg", 0.9);

      const response = await api.post("/users/login/face/", {
        username: username.trim(),
        face_image: faceImage,
      });

      if (response.data.status === "success") {
        const access = response.data.access || response.data.data?.access;
        const refresh = response.data.refresh || response.data.data?.refresh;

        if (access && refresh) {
          saveTokens(access, refresh);
        }

        const loggedInUser = response.data.username || username.trim();
        localStorage.setItem("username", loggedInUser);
        setMessage(response.data.message || "Face verified successfully!");

        setTimeout(() => {
          onSuccess();
        }, 500);
      } else {
        setMessage(response.data.message || "Face login failed.");
      }
    } catch (error) {
      console.error("Face login error:", error);
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage("Face verification failed. Please align your face with good lighting or use password login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden border-2 border-teal-500/40 shadow-xl bg-black aspect-video flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Guiding border */}
        <div className="absolute inset-0 border-2 border-dashed border-teal-400/30 rounded-2xl pointer-events-none m-4 flex items-center justify-center">
          <span className="text-teal-200/60 text-xs bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
            {cameraReady ? "Align your face in the box" : "Initializing camera..."}
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {message && (
        <p className="text-center text-xs p-2.5 rounded-xl bg-red-500/20 text-red-200 border border-red-500/30">
          {message}
        </p>
      )}

      <button
        onClick={handleFaceLogin}
        disabled={loading}
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl transition duration-200 disabled:opacity-50 shadow-md flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Verifying Face...</span>
          </>
        ) : (
          <span>Scan & Sign In</span>
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full bg-slate-800/80 hover:bg-slate-700 text-gray-300 py-2.5 rounded-xl transition text-sm"
      >
        Back to Password Login
      </button>
    </div>
  );
};

export default FaceLogin;
