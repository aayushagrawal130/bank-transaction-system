import React, { useState } from "react";
import { User, Lock, X, CheckCircle, AlertCircle, Shield } from "lucide-react";
import API from "../api";

export default function ProfileModal({ user, onClose, onPasswordChanged }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await API.put("/auth/change-password", {
        currentPassword,
        newPassword
      });
      setSuccess(res.data?.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (onPasswordChanged) onPasswordChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update password. Verify your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.avatar}>
              <User size={22} color="var(--color-primary)" />
            </div>
            <div>
              <h3 style={styles.title}>Client Profile & Credentials</h3>
              <p style={styles.subtitle}>Apex Horizon Vault Credentials</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* User Info Overview */}
        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Client Name:</span>
            <strong style={styles.infoValue}>{user?.name}</strong>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email Address:</span>
            <span style={styles.infoValue}>{user?.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Authorization Role:</span>
            <span style={styles.roleBadge}>
              {user?.systemUser ? (
                <>
                  <Shield size={12} style={{ marginRight: 4 }} />
                  Treasury Officer
                </>
              ) : (
                "Private Client"
              )}
            </span>
          </div>
        </div>

        {/* Password Update Form */}
        <div style={styles.formSection}>
          <h4 style={styles.sectionHeading}>
            <Lock size={16} color="var(--color-accent)" style={{ marginRight: 6 }} />
            Update Vault Password
          </h4>

          {error && (
            <div className="alert alert-error" style={{ fontSize: "0.85rem" }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert alert-success" style={{ fontSize: "0.85rem" }}>
              <CheckCircle size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.8rem" }}>Current Password</label>
              <input
                type="password"
                className="form-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.8rem" }}>New Password</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: "0.8rem" }}>Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? "Updating Credentials..." : "Save New Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 25, 47, 0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    backgroundColor: "var(--color-white)",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "480px",
    padding: "28px",
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--color-border)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid var(--color-border)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "var(--color-accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "var(--color-primary)",
  },
  subtitle: {
    fontSize: "0.75rem",
    color: "var(--color-text-muted)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--color-text-muted)",
    padding: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
  },
  infoCard: {
    backgroundColor: "var(--color-bg-light)",
    borderRadius: "var(--border-radius)",
    padding: "16px",
    marginBottom: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    border: "1px solid var(--color-border)",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.85rem",
  },
  infoLabel: {
    color: "var(--color-text-muted)",
  },
  infoValue: {
    color: "var(--color-primary)",
    fontWeight: "500",
  },
  roleBadge: {
    display: "inline-flex",
    alignItems: "center",
    backgroundColor: "var(--color-accent-light)",
    color: "var(--color-primary)",
    fontSize: "0.75rem",
    padding: "3px 8px",
    borderRadius: "100px",
    fontWeight: "600",
  },
  formSection: {
    marginTop: "10px",
  },
  sectionHeading: {
    display: "flex",
    alignItems: "center",
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "var(--color-primary)",
    marginBottom: "15px",
  },
  submitBtn: {
    width: "100%",
    padding: "12px",
    fontSize: "0.95rem",
    marginTop: "8px",
  }
};
