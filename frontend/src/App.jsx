import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import Transactions from "./pages/Transactions/Transactions";
import SystemAdmin from "./pages/SystemAdmin/SystemAdmin";
import API from "./api";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      const savedUser = localStorage.getItem("user_data");
      const token = localStorage.getItem("auth_token");

      if (token) {
        try {
          // Verify with backend
          const res = await API.get("/auth/me");
          if (res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem("user_data", JSON.stringify(res.data.user));
          } else if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        } catch (e) {
          console.warn("Session validation failed:", e);
          // Only clear if 401
          if (e.response?.status === 401) {
            localStorage.removeItem("user_data");
            localStorage.removeItem("auth_token");
            setUser(null);
          } else if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
            } catch (err) {}
          }
        }
      }
      setBootstrapping(false);
    };

    initSession();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogoutSuccess = () => {
    setUser(null);
    localStorage.removeItem("user_data");
    localStorage.removeItem("auth_token");
  };

  if (bootstrapping) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span style={styles.loadingText}>Initializing Secure Session...</span>
      </div>
    );
  }

  return (
    <Router>
      <Navbar user={user} onLogout={handleLogoutSuccess} />
      <main style={styles.main}>
        <Routes>
          {/* Main Entry / Auth Routes (Always open Login directly from GitHub or root link) */}
          <Route 
            path="/" 
            element={<Login onLoginSuccess={handleLoginSuccess} />} 
          />
          <Route 
            path="/login" 
            element={<Login onLoginSuccess={handleLoginSuccess} />} 
          />
          <Route 
            path="/register" 
            element={<Register onLoginSuccess={handleLoginSuccess} />} 
          />

          {/* Protected Client Portal Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute user={user}>
                <Dashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute user={user}>
                <Transactions user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/system-admin"
            element={
              <ProtectedRoute user={user} requireAdmin={true}>
                <SystemAdmin user={user} />
              </ProtectedRoute>
            }
          />

          {/* Catch-all Route redirects to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

const styles = {
  main: {
    minHeight: "calc(100vh - 80px)",
    backgroundColor: "var(--color-bg-light)",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    gap: "20px",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid rgba(255, 255, 255, 0.1)",
    borderTopColor: "var(--color-accent)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    fontFamily: "var(--font-sans)",
    fontSize: "1rem",
    fontWeight: "500",
    letterSpacing: "0.05em",
    color: "var(--color-accent)",
  }
};
