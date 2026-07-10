import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/axios";
import FaceLogin from "../components/FaceLogin";

import worldImage from "../assets/world.png";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [showFaceLogin, setShowFaceLogin] = useState(false);

  const handlePasswordLogin = async () => {
    if (!username || !password) {
      setMessage("Enter username and password.");

      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/api/password-login/", {
        username,
        password,
      });

      setMessage(response.data.message);

      if (response.data.status === "success") {
        navigate("/home");
      }
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.message);
      } else {
        setMessage("Unable to connect to server.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFaceSuccess = () => {
    navigate("/home");
  };

  return (
    <div className="bg-black min-h-screen flex items-center justify-center">
      <div className="flex bg-black text-white rounded-lg shadow-lg max-w-6xl w-full p-6">
        {/* Left Side */}

        <div className="hidden lg:flex w-1/2 items-center justify-center bg-slate-500 rounded">
          <img src={worldImage} alt="World" className="w-full" />
        </div>

        {/* Right Side */}

        <div className="w-full lg:w-1/2 px-8 py-6">
          <h1 className="text-4xl font-bold text-center mb-8">DVCHAT</h1>

          {/* Username */}

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 mb-4 outline-none"
          />

          {!showFaceLogin ? (
            <>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded bg-gray-800 mb-4 outline-none"
              />

              <button
                onClick={handlePasswordLogin}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 py-3 rounded"
              >
                {loading ? "Logging In..." : "Login"}
              </button>

              <div className="text-center my-4 text-gray-400">OR</div>

              <button
                onClick={() => setShowFaceLogin(true)}
                className="w-full bg-white text-black py-3 rounded hover:bg-gray-300"
              >
                Use Face Login Instead
              </button>
            </>
          ) : (
            <FaceLogin
              username={username}
              onSuccess={handleFaceSuccess}
              onBack={() => setShowFaceLogin(false)}
            />
          )}

          {message && (
            <p className="text-green-500 text-center mt-5">{message}</p>
          )}

          <div className="text-center mt-6">
            Don't have an account?
            <Link to="/register" className="text-blue-400 ml-2">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
