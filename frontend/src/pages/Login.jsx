import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { saveTokens } from "../auth/TokenService";
import FaceLogin from "../components/Facelogin";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [useFaceLogin, setUseFaceLogin] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    setMessage("");

    if (!username.trim() || !password) {
      setMessage("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/users/password-login/", {
        username: username.trim(),
        password,
      });

      if (response.data.status === "success") {
        const { access, refresh } = response.data.data;
        saveTokens(access, refresh);
        localStorage.setItem("username", username.trim());
        navigate("/home");
      } else {
        setMessage(response.data.message || "Login failed.");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        setMessage(Object.values(errors).flat().join(" "));
      } else {
        setMessage(error.response?.data?.message || "Invalid credentials or server error.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a0c1e] via-[#091017] to-[#0c1a17] relative p-4">
      {/* Ambient background glows */}
      <div className="absolute -left-24 bottom-0 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -right-24 top-0 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

      {/* Decorative shapes */}
      <div className="absolute -left-32 -bottom-32 w-80 h-80 rotate-45 border border-teal-400/10 pointer-events-none" />
      <div className="absolute -right-32 -top-32 w-80 h-80 rotate-45 border border-teal-400/10 pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-[400px] px-8 py-8 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {/* App Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <svg className="w-7 h-7 text-slate-950 font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-wide">
            Welcome to <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">DVChat</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {useFaceLogin ? "Sign in using Facial Recognition" : "Sign in to connect with friends"}
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="mb-4 text-xs p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-center">
            {message}
          </div>
        )}

        {useFaceLogin ? (
          /* Face Recognition Mode */
          <FaceLogin
            username={username}
            onSuccess={() => navigate("/home")}
            onBack={() => setUseFaceLogin(false)}
          />
        ) : (
          /* Password Login Mode */
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
            </div>

            {/* Login Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition duration-200 disabled:opacity-50 shadow-lg shadow-teal-500/20 text-sm tracking-wide mt-2"
            >
              {loading ? "LOGGING IN..." : "SIGN IN"}
            </button>

            {/* Face Login Option Button */}
            <button
              type="button"
              onClick={() => {
                if (!username.trim()) {
                  setMessage("Please enter your username above to use Face Login.");
                  return;
                }
                setMessage("");
                setUseFaceLogin(true);
              }}
              className="w-full bg-slate-800/80 hover:bg-slate-800 text-teal-300 font-medium py-2.5 rounded-xl transition duration-200 text-xs border border-teal-500/20 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Login with Face Recognition</span>
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-3 text-gray-500 font-semibold tracking-wider">
              New to DVChat?
            </span>
          </div>
        </div>

        {/* Register Link */}
        <Link
          to="/register"
          className="w-full flex items-center justify-center py-2.5 bg-slate-950 hover:bg-slate-800 text-gray-200 font-semibold rounded-xl text-xs border border-slate-800 hover:border-slate-700 transition tracking-wider"
        >
          CREATE AN ACCOUNT
        </Link>
      </div>
    </div>
  );
}

export default Login;
