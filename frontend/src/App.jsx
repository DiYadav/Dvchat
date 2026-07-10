import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";

// Temporary pages (replace later)
function Register() {
    return <h1>Register Page</h1>;
}

function Home() {
    return <h1>Home Page</h1>;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Redirect root to login */}
                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

                {/* Login */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* Register */}
                <Route
                    path="/register"
                    element={<Register />}
                />

                {/* Home */}
                <Route
                    path="/home"
                    element={<Home />}
                />

                {/* 404 */}
                <Route
                    path="*"
                    element={<h1>404 - Page Not Found</h1>}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;