import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const ProtectedRoute = () => {
  const token = localStorage.getItem("jwt");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      localStorage.removeItem("jwt");
      return <Navigate to="/" replace />;
    }
    
    return <Outlet />;  
  } catch (error) {
    localStorage.removeItem("jwt");
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;