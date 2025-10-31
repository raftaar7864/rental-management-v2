// frontend/src/components/ProtectedRoute.jsx
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ roles = [], children }) {
  const { user, isAuthenticated } = useContext(AuthContext);

  // Not logged in
  if (!isAuthenticated()) return <Navigate to="/login" replace />;

  // If no roles required, allow any authenticated user
  if (!roles || roles.length === 0) return children;

  // If user object missing or role missing, deny access
  const userRole = user?.role ? user.role.toString().toLowerCase() : null;
  const allowed = roles.map(r => r.toString().toLowerCase());

  if (!userRole || !allowed.includes(userRole)) {
    // Redirect to explicit unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
