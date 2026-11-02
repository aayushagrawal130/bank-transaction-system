import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Landmark, LogOut, User, Shield, Menu, X, Settings } from "lucide-react";
import API from "../api";
import ProfileModal from "./ProfileModal";

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed on server:", err);
    } finally {
      onLogout();
      navigate("/login");
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header style={styles.header}>
        <div style={styles.container}>
          <Link to="/" style={styles.logoContainer} onClick={() => setMobileMenuOpen(false)}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Landmark size={28} color="var(--color-accent)" />
              <div>
                <span className="serif-title" style={styles.logoText}>APEX HORIZON</span>
                <div style={styles.logoSubtext}>BANK & TRUST</div>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <nav style={styles.nav}>
              <Link 
                to="/" 
                style={{
                  ...styles.navLink,
                  ...(isActive("/") ? styles.activeNavLink : {})
                }}
              >
                Dashboard
              </Link>
              <Link 
                to="/transactions" 
                style={{
                  ...styles.navLink,
                  ...(isActive("/transactions") ? styles.activeNavLink : {})
                }}
              >
                Transfers & History
              </Link>
              {user.systemUser && (
                <Link 
                  to="/system-admin" 
                  style={{
                    ...styles.navLink,
                    ...styles.adminLink,
                    ...(isActive("/system-admin") ? styles.activeNavLink : {})
                  }}
                >
                  <Shield size={16} style={{ marginRight: 6 }} />
                  Treasury
                </Link>
              )}
            </nav>
          )}

          {/* Right Section / Auth */}
          <div style={styles.userSection}>
            {user ? (
              <>
                <div 
                  style={styles.userInfo} 
                  onClick={() => setShowProfile(true)}
                  title="Click to view profile & settings"
                >
                  <div style={styles.avatar}>
                    <User size={16} color="var(--color-primary)" />
                  </div>
                  <div style={styles.userDetails}>
                    <span style={styles.userName}>{user.name}</span>
                    <span style={styles.userRole}>
                      {user.systemUser ? "Treasury Officer" : "Private Client"}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowProfile(true)} 
                  className="btn btn-outline-gold"
                  style={styles.profileBtn}
                  title="Profile & Password"
                >
                  <Settings size={15} style={{ marginRight: 5 }} />
                  Profile
                </button>

                <button onClick={handleLogout} className="btn btn-outline-gold" style={styles.logoutBtn}>
                  <LogOut size={16} style={{ marginRight: 6 }} />
                  Sign Out
                </button>
              </>
            ) : (
              <div style={styles.authButtons}>
                {location.pathname !== "/login" && (
                  <Link to="/login" className="btn btn-outline-gold" style={{ marginRight: 10 }}>
                    Sign In
                  </Link>
                )}
                {location.pathname !== "/register" && (
                  <Link to="/register" className="btn btn-accent">
                    Open Account
                  </Link>
                )}
              </div>
            )}

            {/* Mobile Hamburger Button */}
            {user && (
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                style={styles.mobileToggle}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && user && (
          <div style={styles.mobileMenu}>
            <Link 
              to="/" 
              style={{ ...styles.mobileNavLink, ...(isActive("/") ? styles.activeMobileNavLink : {}) }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              to="/transactions" 
              style={{ ...styles.mobileNavLink, ...(isActive("/transactions") ? styles.activeMobileNavLink : {}) }}
              onClick={() => setMobileMenuOpen(false)}
            >
              Transfers & History
            </Link>
            {user.systemUser && (
              <Link 
                to="/system-admin" 
                style={{ ...styles.mobileNavLink, ...(isActive("/system-admin") ? styles.activeMobileNavLink : {}) }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Treasury
              </Link>
            )}
            <button 
              onClick={() => { setMobileMenuOpen(false); setShowProfile(true); }}
              style={styles.mobileNavLinkBtn}
            >
              Profile & Password
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              style={{ ...styles.mobileNavLinkBtn, color: "var(--color-error)" }}
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal 
          user={user} 
          onClose={() => setShowProfile(false)} 
        />
      )}
    </>
  );
}

const styles = {
  header: {
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    borderBottom: "2px solid var(--color-accent)",
    padding: "0 20px",
    height: "80px",
    display: "flex",
    alignItems: "center",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "var(--shadow-md)",
  },
  container: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    textDecoration: "none",
  },
  logoText: {
    fontSize: "1.3rem",
    fontWeight: "700",
    color: "var(--color-white)",
    lineHeight: "1.1",
    letterSpacing: "0.05em",
  },
  logoSubtext: {
    fontSize: "0.65rem",
    color: "var(--color-accent)",
    fontWeight: "700",
    letterSpacing: "0.2em",
    marginTop: "2px",
  },
  nav: {
    display: "flex",
    gap: "30px",
    alignItems: "center",
    marginLeft: "40px",
    flex: 1,
  },
  navLink: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: "0.95rem",
    fontWeight: "500",
    transition: "var(--transition-smooth)",
    padding: "8px 4px",
    borderBottom: "2px solid transparent",
  },
  activeNavLink: {
    color: "var(--color-accent)",
    borderBottomColor: "var(--color-accent)",
  },
  adminLink: {
    display: "flex",
    alignItems: "center",
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "6px",
    transition: "var(--transition-smooth)",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "var(--color-accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  userDetails: {
    display: "flex",
    flexDirection: "column",
  },
  userName: {
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "var(--color-white)",
  },
  userRole: {
    fontSize: "0.75rem",
    color: "var(--color-accent)",
  },
  profileBtn: {
    padding: "6px 10px",
    fontSize: "0.8rem",
    display: "inline-flex",
  },
  logoutBtn: {
    padding: "6px 12px",
    fontSize: "0.8rem",
  },
  authButtons: {
    display: "flex",
    alignItems: "center",
  },
  mobileToggle: {
    display: "none",
    background: "none",
    border: "none",
    color: "var(--color-accent)",
    cursor: "pointer",
    padding: "6px",
  },
  mobileMenu: {
    position: "absolute",
    top: "80px",
    left: 0,
    right: 0,
    backgroundColor: "var(--color-primary)",
    borderBottom: "2px solid var(--color-accent)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    boxShadow: "var(--shadow-lg)",
  },
  mobileNavLink: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: "1rem",
    padding: "8px 0",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  activeMobileNavLink: {
    color: "var(--color-accent)",
    fontWeight: "600",
  },
  mobileNavLinkBtn: {
    background: "none",
    border: "none",
    textAlign: "left",
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: "1rem",
    padding: "8px 0",
    cursor: "pointer",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  }
};
