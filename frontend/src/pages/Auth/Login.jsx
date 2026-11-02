import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Mail, Lock, Landmark } from "lucide-react";
import API from "../../api";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("session_expired")) {
      setError("Your session has expired. Please sign in again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", { email, password });
      const { user, token } = res.data;
      
      // Store session details
      localStorage.setItem("auth_token", token);
      localStorage.setItem("user_data", JSON.stringify(user));
      
      onLoginSuccess(user);
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.message || 
        "Invalid email or password. Please verify your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.cardContainer}>
        {/* Left Side: Brand Showcase */}
        <div style={styles.brandPanel}>
          <div style={styles.brandOverlay} />
          <div style={styles.brandContent}>
            <div style={styles.brandHeader}>
              <Landmark size={40} color="var(--color-accent)" />
              <h2 className="serif-title" style={styles.brandTitle}>APEX HORIZON</h2>
              <span style={styles.brandSubtitle}>WEALTH MANAGEMENT</span>
            </div>
            
            <div style={styles.quoteBlock}>
              <p style={styles.quoteText}>
                "Trust is the coin of the realm. We vault your capital and ledger your transactions with unmatched integrity."
              </p>
              <span style={styles.quoteAuthor}>— Apex Horizon Trust Charter</span>
            </div>

            <div style={styles.securityBadge}>
              <ShieldCheck size={18} color="var(--color-accent)" />
              <span>Institutional Grade Encryption</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div style={styles.formPanel}>
          <div style={styles.formHeader}>
            <h1 className="serif-title" style={styles.title}>Client Portal</h1>
            <p style={styles.subtitle}>Enter your credentials to access your private ledger.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} style={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  style={styles.inputWithIcon}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} style={styles.inputIcon} />
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  style={styles.inputWithIcon}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? "Verifying Credentials..." : "Secure Sign In"}
            </button>
          </form>

          <div style={styles.footer}>
            <span>New Private Client? </span>
            <Link to="/register" className="btn-link" style={styles.registerLink}>
              Open an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "calc(100vh - 80px)",
    padding: "20px",
  },
  cardContainer: {
    display: "flex",
    width: "100%",
    maxWidth: "960px",
    minHeight: "540px",
    backgroundColor: "var(--color-white)",
    borderRadius: "12px",
    boxShadow: "var(--shadow-lg)",
    overflow: "hidden",
    border: "1px solid var(--color-border)",
  },
  brandPanel: {
    flex: 1,
    backgroundColor: "var(--color-primary)",
    position: "relative",
    padding: "50px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    color: "var(--color-white)",
    background: "linear-gradient(135deg, #0A192F 0%, #172A45 100%)",
  },
  brandOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: "1px solid rgba(197, 168, 128, 0.15)",
    margin: "15px",
    borderRadius: "8px",
    pointerEvents: "none",
  },
  brandContent: {
    zIndex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  brandHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  brandTitle: {
    color: "var(--color-white)",
    fontSize: "1.8rem",
    letterSpacing: "0.08em",
    marginTop: "10px",
  },
  brandSubtitle: {
    color: "var(--color-accent)",
    fontSize: "0.75rem",
    fontWeight: "700",
    letterSpacing: "0.25em",
  },
  quoteBlock: {
    margin: "40px 0",
    borderLeft: "2px solid var(--color-accent)",
    paddingLeft: "20px",
  },
  quoteText: {
    fontFamily: "var(--font-display)",
    fontStyle: "italic",
    fontSize: "1.1rem",
    lineHeight: "1.6",
    color: "#E2E8F0",
  },
  quoteAuthor: {
    display: "block",
    fontSize: "0.8rem",
    color: "var(--color-accent)",
    marginTop: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  },
  securityBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "0.8rem",
    color: "rgba(255, 255, 255, 0.6)",
  },
  formPanel: {
    flex: 1.1,
    padding: "50px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  formHeader: {
    marginBottom: "30px",
  },
  title: {
    fontSize: "2rem",
    color: "var(--color-primary)",
    marginBottom: "8px",
  },
  subtitle: {
    color: "var(--color-text-muted)",
    fontSize: "0.95rem",
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--color-text-muted)",
  },
  inputWithIcon: {
    paddingLeft: "42px",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    fontSize: "1rem",
    fontWeight: "600",
    backgroundColor: "var(--color-primary)",
    borderColor: "var(--color-primary)",
    marginTop: "10px",
  },
  footer: {
    marginTop: "30px",
    textAlign: "center",
    fontSize: "0.9rem",
    color: "var(--color-text-muted)",
  },
  registerLink: {
    fontWeight: "600",
    color: "var(--color-accent)",
  }
};
