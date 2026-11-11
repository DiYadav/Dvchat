import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Chat from "./pages/Chat";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes (Redirect to /home if already logged in) */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected Routes (Require JWT authentication) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/chat" element={<Chat />} />
        </Route>

        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
              <h1 className="text-4xl font-extrabold text-teal-400">404</h1>
              <p className="text-gray-400">Page not found</p>
              <a
                href="/home"
                className="bg-slate-800 hover:bg-slate-700 text-teal-400 font-semibold px-4 py-2 rounded-xl text-sm transition"
              >
                Go to Home
              </a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;