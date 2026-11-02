import React, { useState, useEffect } from "react";
import { Shield, Coins, AlertCircle, Key, RefreshCw } from "lucide-react";
import API from "../../api";

const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "idx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export default function SystemAdmin({ user }) {
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setIdempotencyKey(generateUUID());
  }, []);

  const handleInjectFunds = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!toAccount || !amount || !idempotencyKey) {
      setError("All fields are required to submit a treasury transaction.");
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError("Treasury funding amount must be greater than zero.");
      return;
    }

    setSubmitting(true);

    try {
      await API.post("/transactions/system/initial-funds", {
        toAccount,
        amount: parseFloat(amount),
        idempotencyKey,
      });

      setSuccess(`Treasury funding of ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(parseFloat(amount))} successfully injected.`);
      setToAccount("");
      setAmount("");
      setIdempotencyKey(generateUUID()); // Refresh key
    } catch (err) {
      console.error("Treasury inject error:", err);
      setError(
        err.response?.data?.message || 
        "Funding authorization rejected. Verify that the target account exists and you have adequate privileges."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <Shield size={32} color="var(--color-accent)" />
          <h1 className="serif-title" style={styles.title}>Treasury Control Panel</h1>
        </div>
        <p style={styles.subtitle}>Execute centralized funding and initial reserves allocation</p>
      </div>

      <div className="card" style={styles.panelCard}>
        <div style={styles.panelHeader}>
          <Coins size={22} color="var(--color-accent)" />
          <h3 style={styles.panelTitle}>Federal Reserves Allocation Form</h3>
        </div>

        <div style={styles.warningBox}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>
            <strong>WARNING:</strong> Initial funding creates money from the central system ledger account. All treasury injections are audited and permanently written to the ledger database.
          </span>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleInjectFunds}>
          <div className="form-group">
            <label className="form-label" htmlFor="toAccount">Target Account ID (Credited User Account)</label>
            <input
              id="toAccount"
              type="text"
              className="form-input"
              value={toAccount}
              onChange={(e) => setToAccount(e.target.value)}
              placeholder="e.g. 64a8fb..."
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="amount">Reserve Amount (INR)</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50,000.00"
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group" style={styles.idempotencyGroup}>
            <div style={styles.idempotencyLabelRow}>
              <label className="form-label" style={{ marginBottom: 0 }}>Treasury Tracking Key</label>
              <div style={styles.tooltip}>
                <Key size={14} color="var(--color-accent)" />
                <span style={{ marginLeft: 4 }}>Unique tracking ID</span>
              </div>
            </div>
            <input
              type="text"
              className="form-input"
              style={styles.readonlyInput}
              value={idempotencyKey}
              readOnly
            />
          </div>

          <button
            type="submit"
            className="btn btn-accent"
            style={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <RefreshCw className="spin" size={18} style={{ marginRight: 8 }} />
                Authorizing Federal Injection...
              </>
            ) : (
              "Authorize Funding Reserve Injection"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "40px 20px",
  },
  header: {
    marginBottom: "35px",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "25px",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: "400",
    color: "var(--color-primary)",
    fontFamily: "var(--font-display)",
  },
  subtitle: {
    color: "var(--color-text-muted)",
    fontSize: "1rem",
    marginTop: "4px",
  },
  panelCard: {
    padding: "30px",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "25px",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "15px",
  },
  panelTitle: {
    fontSize: "1.2rem",
    fontWeight: "600",
    color: "var(--color-primary)",
  },
  warningBox: {
    display: "flex",
    gap: "12px",
    backgroundColor: "var(--color-warning-bg)",
    color: "var(--color-warning)",
    padding: "15px",
    borderRadius: "var(--border-radius)",
    border: "1px solid rgba(180, 83, 9, 0.15)",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    marginBottom: "25px",
  },
  idempotencyGroup: {
    backgroundColor: "var(--color-bg-light)",
    padding: "15px",
    borderRadius: "var(--border-radius)",
    border: "1px solid var(--color-border)",
  },
  idempotencyLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  tooltip: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "0.75rem",
    color: "var(--color-text-muted)",
    fontWeight: "600",
  },
  readonlyInput: {
    backgroundColor: "var(--color-white)",
    color: "var(--color-text-muted)",
    fontFamily: "monospace",
    fontSize: "0.85rem",
    borderColor: "var(--color-border)",
    cursor: "not-allowed",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    fontSize: "1rem",
    fontWeight: "700",
    color: "var(--color-primary)",
    marginTop: "15px",
  }
};
