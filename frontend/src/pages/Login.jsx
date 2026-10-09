import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../api/axios";
import { saveTokens } from "../auth/TokenService";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async () => {
    setMessage("");

    if (!username || !password) {
      setMessage("Enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/users/password-login/", {
        username,
        password,
      });

      if (response.data.status === "success") {
        const { access, refresh } = response.data.data;

        saveTokens(access, refresh);

        navigate("/home");
      } else {
        setMessage(
          response.data.message || "Login failed."
        );
      }
    } catch (error) {
      console.error("Login error:", error);

      if (error.response) {
        const errors = error.response.data.errors;

        if (errors) {
          setMessage(
            Object.values(errors).flat().join(" ")
          );
        } else {
          setMessage(
            error.response.data.message ||
              "Login failed."
          );
        }
      } else {
        setMessage("Unable to connect to server.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#2f1028] via-[#0b141c] to-[#16241f] relative">

      {/* Ambient glow, matched to the teal that bleeds through the corners in the reference image */}
      <div className="absolute -left-24 bottom-0 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl" />
      <div className="absolute -right-24 top-0 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl" />

      {/* Decorative background */}
      <div className="absolute -left-32 -bottom-32 w-80 h-80 rotate-45 border border-teal-400/20" />

      <div className="absolute -right-32 -top-32 w-80 h-80 rotate-45 border border-teal-400/20" />

      <div className="absolute left-10 top-20 w-32 h-32 rotate-45 border border-teal-400/10" />

      <div className="absolute right-20 bottom-20 w-40 h-40 rotate-45 border border-teal-400/10" />

      {/* Login Card */}
      <div
        className="
          relative
          z-10
          w-[380px]
          px-8
          py-7
          rounded-sm
          bg-gradient-to-b
          from-[#8fe3d6]/60
          to-[#173f3a]/50
          backdrop-blur-md
          shadow-[0_20px_50px_rgba(0,0,0,0.45)]
        "
      >

        {/* Title */}
        <h1
          className="
            text-center
            text-[#2f7d76]
            text-lg
            font-medium
            tracking-[3px]
            mb-7
          "
        >
          MEMBER LOGIN
        </h1>

        {/* Username */}
        <div
          className="
            flex
            items-center
            h-[42px]
            mb-3
            bg-[#0f4146]/80
          "
        >
          <div
            className="
              w-[42px]
              h-full
              flex
              items-center
              justify-center
              text-white
            "
          >
            👤
          </div>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            className="
              flex-1
              h-full
              bg-transparent
              outline-none
              border-none
              text-white
              text-xs
              px-2
              placeholder:text-white/40
            "
          />
        </div>

        {/* Password */}
        <div
          className="
            flex
            items-center
            h-[42px]
            mb-4
            bg-[#0f4146]/80
          "
        >
          <div
            className="
              w-[42px]
              h-full
              flex
              items-center
              justify-center
              text-white
            "
          >
            🔒
          </div>

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="
              flex-1
              h-full
              bg-transparent
              outline-none
              border-none
              text-white
              text-xs
              px-2
              placeholder:text-white/40
            "
          />
        </div>

        {/* Login button */}
        <button
          onClick={handlePasswordLogin}
          disabled={loading}
          className="
            w-full
            h-[42px]
            bg-white/80
            hover:bg-white
            text-[#34434a]
            text-xs
            font-semibold
            tracking-[1px]
            transition
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {loading ? "LOGGING IN..." : "LOGIN"}
        </button>

        {/* Forgot password */}
        <Link
          to="/forgot-password"
          className="
            block
            text-center
            text-white/60
            hover:text-white
            text-[10px]
            mt-4
            transition
          "
        >
          Forgot Password? Click Here
        </Link>

        {/* Message */}
        {message && (
          <p className="text-center text-white text-xs mt-4">
            {message}
          </p>
        )}

        {/* Divider */}
        <div className="h-px w-full bg-white/25 my-6" />

        {/* Register */}
        <Link
          to="/register"
          className="
            flex
            items-center
            justify-center
            w-full
            h-[42px]
            bg-[#12c9a6]
            hover:bg-[#20dfbc]
            text-[#063b39]
            text-xs
            font-semibold
            tracking-[1px]
            transition
            no-underline
          "
        >
          REGISTER
        </Link>

      </div>
    </div>
  );
}

export default Login;
