import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, user, requireAdmin = false }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !user.systemUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}
