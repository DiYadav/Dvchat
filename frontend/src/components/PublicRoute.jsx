import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../auth/TokenService";

const PublicRoute = () => {
  return isAuthenticated() ? <Navigate to="/home" replace /> : <Outlet />;
};

export default PublicRoute;
