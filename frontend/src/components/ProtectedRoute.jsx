import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, user, requireAdmin = false }) {
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !user.systemUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
