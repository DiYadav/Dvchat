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
    } catch (err) {
      console.log(err);
      setMessage("Unable to access camera.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
  };

  const captureFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0);

    const image = canvas.toDataURL("image/jpeg");

    setCapturedImage(image);

    setMessage("Face captured successfully.");
  };

  const handleRegister = async () => {
    if (!username || !email || !password1 || !password2) {
      setMessage("All fields are required.");
      return;
    }

    if (password1 !== password2) {
      setMessage("Passwords do not match.");
      return;
    }

    if (!capturedImage) {
      setMessage("Please capture your face.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post("/register/", {
        username,
        email,
        password1,
        password2,
        face_image: capturedImage,
      });

      setMessage(response.data.message);

      stopCamera();

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.log(error);

      setMessage(error.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex bg-black text-white rounded-lg shadow-lg max-w-5xl w-full p-4">
        <div className="hidden lg:block w-1/2">
          <img
            src="/images/insta_mock.jpg"
            alt="register"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>

        <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-8 space-y-5">
          <h1 className="text-4xl font-bold text-center">DVCHAT</h1>

          <input
            type="text"
            placeholder="Username"
            className="w-full p-3 rounded bg-gray-800"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded bg-gray-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded bg-gray-800"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full p-3 rounded bg-gray-800"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />

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
              onClick={captureFace}
              className="w-1/2 bg-white text-black py-2 rounded hover:bg-gray-200"
            >
              Capture Face
            </button>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-1/2 bg-blue-600 py-2 rounded hover:bg-blue-700"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>

          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured Face"
              className="rounded-lg border border-gray-700"
            />
          )}

          {message && <p className="text-center text-red-400">{message}</p>}

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
