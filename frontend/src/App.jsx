import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";  

// Temporary Home page
function Home() {
    return <h1>Home Page</h1>;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                <Route
                    path="/home"
                    element={<Home />}
                />

                <Route
                    path="*"
                    element={<h1>404 - Page Not Found</h1>}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;