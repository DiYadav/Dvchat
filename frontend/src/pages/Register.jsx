import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../api/axios";

const Register = () => {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");

  const [capturedImage, setCapturedImage] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
// Start camera
 useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
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
// Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
  };
  // Capture face
    const captureFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setMessage("Camera is not ready.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg");
    setCapturedImage(image);
    setMessage("Face captured successfully.");
  };
    // Register
   const handleRegister = async () => {
    setMessage("");

    // Required fields
    if (!username || !email || !password1 || !password2) {
      setMessage("All fields are required.");
      return;
    }

    // Password match
    if (password1 !== password2) {
      setMessage("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);

      const response = await axios.post("/register/", {
        username: username,
        email: email,
        password1: password1,
        password2: password2,
        face_image: capturedImage || null,
      });

      console.log("Register response:", response.data);

      if (response.data.status === "success") {
        setMessage(response.data.message || "Registration successful.");

        stopCamera();
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        setMessage(response.data.message || "Registration failed.");
      }
    } catch (error) {
      console.error("Registration error:", error);

      if (error.response) {
        setMessage(error.response.data.message || "Registration failed.");
      } else {
        setMessage("Unable to connect to server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex bg-black text-white rounded-lg shadow-lg max-w-5xl w-full p-4">
        {/* Left Image */}

        <div className="hidden lg:block w-1/2">
          <img
            src="/images/insta_mock.jpg"
            alt="register"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>

        {/* Right Form */}

        <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-8 space-y-5">
          <h1 className="text-4xl font-bold text-center">DVCHAT</h1>

          {/* Username */}

          <input
            type="text"
            placeholder="Username"
            className="w-full p-3 rounded bg-gray-800"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {/* Email */}

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded bg-gray-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Password */}

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded bg-gray-800"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
          />

          {/* Confirm Password */}

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full p-3 rounded bg-gray-800"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />

          {/* Camera */}

          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-48 rounded border-2 border-gray-600 object-cover"
          />

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-4">
            <button
              type="button"
              onClick={captureFace}
              disabled={loading}
              className="w-1/2 bg-white text-black py-2 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Capture Face
            </button>

            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              className="w-1/2 bg-blue-600 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>

          {capturedImage && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Captured Face</p>

              <img
                src={capturedImage}
                alt="Captured Face"
                className="w-full rounded-lg border border-gray-700"
              />
            </div>
          )}

          {/* Message */}

          {message && <p className="text-center text-red-400">{message}</p>}

          {/* Login */}

          <p className="text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-500 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
