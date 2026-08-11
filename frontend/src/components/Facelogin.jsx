import { useEffect, useRef, useState } from "react";

import axios from "../api/axios";

const FaceLogin = ({ username, onSuccess, onBack }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // -------------------------
  // Start camera
  // -------------------------

  useEffect(() => {
    let stream;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error(error);

        setMessage("Unable to access camera.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // -------------------------
  // Face Login
  // -------------------------

  const handleFaceLogin = async () => {
    if (!username) {
      setMessage("Please enter username first.");

      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setMessage("Camera is not ready.");

      return;
    }

    try {
      setLoading(true);
      setMessage("");

      // -------------------------
      // Capture image
      // -------------------------

      canvas.width = video.videoWidth;

      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const faceImage = canvas.toDataURL("image/jpeg");

      // -------------------------
      // API
      // -------------------------

      const response = await axios.post("/face-login/", {
        username,
        face_image: faceImage,
      });

      // -------------------------
      // JWT
      // -------------------------

      if (response.data.status === "success") {
        const { access, refresh } = response.data;

        localStorage.setItem("access_token", access);

        localStorage.setItem("refresh_token", refresh);

        localStorage.setItem("username", response.data.username);

        setMessage(response.data.message);

        // Tell Login.jsx
        onSuccess();
      }
    } catch (error) {
      console.error(error);

      if (error.response) {
        setMessage(error.response.data.message || "Face login failed.");
      } else {
        setMessage("Unable to connect to server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-48 object-cover rounded border-2 border-gray-600"
      />

      <canvas ref={canvasRef} className="hidden" />

      <button
        onClick={handleFaceLogin}
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 py-3 rounded disabled:opacity-50"
      >
        {loading ? "Checking Face..." : "Login with Face"}
      </button>

      <button
        onClick={onBack}
        className="w-full bg-gray-700 hover:bg-gray-600 py-3 rounded"
      >
        Back to Password Login
      </button>

      {message && <p className="text-center text-yellow-400">{message}</p>}
    </div>
  );
};

export default FaceLogin;
