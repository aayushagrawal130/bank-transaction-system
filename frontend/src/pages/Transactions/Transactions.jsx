import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Send, History, RefreshCw, Key, ArrowDownLeft, ArrowUpRight, 
  CheckCircle, AlertCircle, UserCheck, ShieldAlert 
} from "lucide-react";
import API from "../../api";

// Reliable UUID generator for browser environments
const generateUUID = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "idx_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export default function Transactions({ user }) {
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  
  // Recipient Lookup State
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  
  // Status State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Server-side Transaction History State
  const [transactions, setTransactions] = useState([]);
  const [myAccountIds, setMyAccountIds] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, SENT, RECEIVED
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });

  const lookupTimerRef = useRef(null);

  // Fetch accounts on load
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/accounts");
      const accountsList = (res.data.accounts || []).filter(acc => acc.status === "ACTIVE");
      setAccounts(accountsList);

      const queryFrom = searchParams.get("fromAccount");
      if (queryFrom && accountsList.some(a => a._id === queryFrom)) {
        setFromAccount(queryFrom);
      } else if (accountsList.length > 0 && !fromAccount) {
        setFromAccount(accountsList[0]._id);
      }

      // Fetch balances
      const balancePromises = accountsList.map(async (acc) => {
        try {
          const balRes = await API.get(`/accounts/balance/${acc._id}`);
          return { id: acc._id, balance: balRes.data.balance };
        } catch (e) {
          return { id: acc._id, balance: 0 };
        }
      });
      const balanceResults = await Promise.all(balancePromises);
      const balanceMap = {};
      balanceResults.forEach(r => balanceMap[r.id] = r.balance);
      setBalances(balanceMap);

    } catch (err) {
      console.error("Error loading accounts:", err);
      setError("Unable to load accounts. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch real transaction history from backend
  const fetchTransactions = async (page = 1) => {
    try {
      setHistoryLoading(true);
      const res = await API.get(`/transactions?page=${page}&limit=15`);
      setTransactions(res.data.transactions || []);
      setMyAccountIds(res.data.accountIds || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchTransactions(1);
    setIdempotencyKey(generateUUID());
  }, [user]);

  // Recipient live lookup effect
  useEffect(() => {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    setRecipientInfo(null);
    setLookupError("");

    const trimmed = toAccount.trim();
    if (trimmed.length === 24) {
      setLookingUp(true);
      lookupTimerRef.current = setTimeout(async () => {
        try {
          const res = await API.get(`/accounts/lookup/${trimmed}`);
          setRecipientInfo(res.data.account);
          setLookupError("");
        } catch (err) {
          setRecipientInfo(null);
          setLookupError(err.response?.data?.message || "Recipient account not found.");
        } finally {
          setLookingUp(false);
        }
      }, 400);
    }
  }, [toAccount]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
      setError("All transfer authorization parameters are required.");
      return;
    }

    if (fromAccount === toAccount) {
      setError("Sender and recipient accounts cannot be the same.");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Transfer amount must be greater than zero.");
      return;
    }

    const currentBalance = balances[fromAccount] || 0;
    if (numericAmount > currentBalance) {
      setError(`Insufficient funds. Your available balance is ${formatCurrency(currentBalance)}.`);
      return;
    }

    if (recipientInfo && recipientInfo.status !== "ACTIVE") {
      setError(`Cannot transfer: Recipient account is ${recipientInfo.status}.`);
      return;
    }

    setSubmitting(true);

    try {
      const res = await API.post("/transactions", {
        fromAccount,
        toAccount: toAccount.trim(),
        amount: numericAmount,
        idempotencyKey,
      });

      setSuccess("Vault transaction executed and dual-entry ledger entries committed successfully!");
      
      // Reset form fields
      setToAccount("");
      setAmount("");
      setRecipientInfo(null);
      
      // Refresh balances and real server-side transactions
      await Promise.all([
        fetchAccounts(),
        fetchTransactions(1)
      ]);
      
      // Re-generate idempotency key for next transfer
      setIdempotencyKey(generateUUID());

    } catch (err) {
      console.error("Transfer error:", err);
      const msg = err.response?.data?.message || "Transaction authorization rejected by bank vault.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val, cur = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: cur,
    }).format(val || 0);
  };

  const truncateId = (id) => {
    if (!id) return "";
    return `${id.substring(0, 6)}...${id.substring(id.length - 4)}`;
  };

  // Filter transactions based on active tab
  const sentCount = transactions.filter(tx => {
    const fromId = tx.fromAccount?._id?.toString() || tx.fromAccount?.toString();
    return myAccountIds.includes(fromId);
  }).length;

  const receivedCount = transactions.filter(tx => {
    const fromId = tx.fromAccount?._id?.toString() || tx.fromAccount?.toString();
    const toId = tx.toAccount?._id?.toString() || tx.toAccount?.toString();
    const isSender = myAccountIds.includes(fromId);
    const isReceiver = myAccountIds.includes(toId);
    return isReceiver && !isSender;
  }).length;

  const filteredTransactions = transactions.filter((tx) => {
    const fromId = tx.fromAccount?._id?.toString() || tx.fromAccount?.toString();
    const toId = tx.toAccount?._id?.toString() || tx.toAccount?.toString();
    const isSender = myAccountIds.includes(fromId);
    const isReceiver = myAccountIds.includes(toId);

    if (activeTab === "SENT") return isSender;
    if (activeTab === "RECEIVED") return isReceiver && !isSender;
    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 className="serif-title" style={styles.title}>Secure Fund Transfer</h1>
          <p style={styles.subtitle}>Execute real-time double-entry ledger transfers across private accounts</p>
        </div>
        <button 
          onClick={() => { fetchAccounts(); fetchTransactions(pagination.page); }} 
          className="btn btn-outline-gold"
          title="Refresh Ledger & History"
        >
          <RefreshCw size={16} className={historyLoading ? "spin" : ""} style={{ marginRight: 6 }} />
          Refresh Data
        </button>
      </div>

      <div style={styles.grid}>
        {/* Left Col: Transfer Form */}
        <div className="card" style={styles.formCard}>
          <div style={styles.cardHeader}>
            <Send size={20} color="var(--color-accent)" />
            <h3 style={styles.cardTitle}>Transfer Authorization</h3>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <CheckCircle size={18} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleTransfer}>
            <div className="form-group">
              <label className="form-label" htmlFor="fromAccount">Debit Account (Sender)</label>
              <select
                id="fromAccount"
                className="form-input"
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                disabled={loading || submitting}
                required
              >
                {accounts.length === 0 && <option value="">No Active Accounts Available</option>}
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>
                    Account {acc._id.slice(0, 8)}... (Balance: {formatCurrency(balances[acc._id] ?? 0, acc.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="form-label" htmlFor="toAccount">Credit Account ID (Recipient Account ID)</label>
                {lookingUp && <span style={styles.lookupStatus}>Verifying account...</span>}
              </div>
              <input
                id="toAccount"
                type="text"
                className="form-input"
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                placeholder="Enter 24-character Account ID (e.g. 64a8fb...)"
                disabled={submitting}
                required
              />

              {/* Recipient Verification Feedback */}
              {recipientInfo && (
                <div style={styles.verifiedBox}>
                  <UserCheck size={16} color="var(--color-success)" />
                  <span>
                    Verified Client: <strong>{recipientInfo.userName}</strong>
                    {recipientInfo.isSelf && " (Your Own Account)"}
                    {" — Status: "}
                    <strong style={{ color: recipientInfo.status === "ACTIVE" ? "var(--color-success)" : "var(--color-error)" }}>
                      {recipientInfo.status}
                    </strong>
                  </span>
                </div>
              )}
              {lookupError && (
                <div style={styles.lookupErrorBox}>
                  <AlertCircle size={14} color="var(--color-error)" />
                  <span>{lookupError}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">Amount (INR)</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={submitting}
                required
              />
              {fromAccount && balances[fromAccount] !== undefined && (
                <div style={styles.availableBalanceText}>
                  Available: {formatCurrency(balances[fromAccount])}
                </div>
              )}
            </div>

            <div className="form-group" style={styles.idempotencyGroup}>
              <div style={styles.idempotencyLabelRow}>
                <label className="form-label" style={{ marginBottom: 0 }}>Idempotency Security Key</label>
                <button
                  type="button"
                  onClick={() => setIdempotencyKey(generateUUID())}
                  style={styles.keyRefreshBtn}
                  title="Generate new idempotency key"
                >
                  <RefreshCw size={12} style={{ marginRight: 4 }} />
                  Regenerate
                </button>
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
              className="btn btn-primary"
              style={styles.submitBtn}
              disabled={submitting || accounts.length === 0}
            >
              {submitting ? (
                <>
                  <RefreshCw className="spin" size={18} style={{ marginRight: 8 }} />
                  Committing Vault Entries...
                </>
              ) : (
                "Authorize & Execute Transfer"
              )}
            </button>
          </form>
        </div>

        {/* Right Col: Server-side Transaction History */}
        <div className="card" style={styles.historyCard} id="history">
          <div style={styles.cardHeader}>
            <History size={20} color="var(--color-accent)" />
            <h3 style={styles.cardTitle}>Live Ledger Transaction History</h3>
          </div>

          {/* Filter Tabs */}
          <div style={styles.tabBar}>
            <button
              style={{ ...styles.tabBtn, ...(activeTab === "ALL" ? styles.activeTabBtn : {}) }}
              onClick={() => setActiveTab("ALL")}
            >
              All ({transactions.length})
            </button>
            <button
              style={{ ...styles.tabBtn, ...(activeTab === "RECEIVED" ? styles.activeTabBtn : {}) }}
              onClick={() => setActiveTab("RECEIVED")}
            >
              Received (Credits) ({receivedCount})
            </button>
            <button
              style={{ ...styles.tabBtn, ...(activeTab === "SENT" ? styles.activeTabBtn : {}) }}
              onClick={() => setActiveTab("SENT")}
            >
              Sent (Debits) ({sentCount})
            </button>
          </div>

          <div style={styles.historyContainer}>
            {historyLoading ? (
              <div style={styles.emptyHistory}>
                <div style={styles.spinner} />
                <span style={{ marginTop: 10, fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
                  Retrieving ledger records from database...
                </span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div style={styles.emptyHistory}>
                <History size={36} color="var(--color-border)" style={{ marginBottom: 10 }} />
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                  No transaction records found in this category.
                </p>
              </div>
            ) : (
              <div style={styles.historyList}>
                {filteredTransactions.map((tx) => {
                  const fromId = tx.fromAccount?._id?.toString() || tx.fromAccount?.toString();
                  const isDebit = myAccountIds.includes(fromId);
                  const senderName = tx.fromAccount?.user?.name || "System Treasury";
                  const receiverName = tx.toAccount?.user?.name || "Private Client";

                  return (
                    <div key={tx._id} style={styles.historyItem}>
                      <div style={styles.historyHeader}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {isDebit ? (
                            <div style={styles.debitIcon}>
                              <ArrowUpRight size={16} />
                            </div>
                          ) : (
                            <div style={styles.creditIcon}>
                              <ArrowDownLeft size={16} />
                            </div>
                          )}
                          <div>
                            <div style={styles.txTitle}>
                              {isDebit ? `Sent to ${receiverName}` : `Received from ${senderName}`}
                            </div>
                            <div style={styles.txId}>ID: {truncateId(tx._id)}</div>
                          </div>
                        </div>

                        <div style={{ ...styles.txAmount, color: isDebit ? "var(--color-error)" : "var(--color-success)" }}>
                          {isDebit ? "-" : "+"}
                          {formatCurrency(tx.amount)}
                        </div>
                      </div>

                      <div style={styles.txDetails}>
                        <div>From: <span style={styles.monoId}>{truncateId(fromId)}</span></div>
                        <div>To: <span style={styles.monoId}>{truncateId(tx.toAccount?._id?.toString() || tx.toAccount?.toString())}</span></div>
                      </div>

                      <div style={styles.txFooter}>
                        <span style={styles.txTime}>
                          {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={styles.completedBadge}>
                          <CheckCircle size={12} style={{ marginRight: 3 }} />
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={styles.ledgerInfo}>
            <p>
              <strong>Vault Audit:</strong> All transactions are permanently sealed in MongoDB multi-document sessions writing simultaneous debit and credit records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "35px",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "25px",
    flexWrap: "wrap",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "1.1fr 1fr",
    gap: "35px",
    alignItems: "start",
  },
  formCard: {
    padding: "30px",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "25px",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "15px",
  },
  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: "600",
    color: "var(--color-primary)",
  },
  lookupStatus: {
    fontSize: "0.75rem",
    color: "var(--color-accent)",
    fontStyle: "italic",
  },
  verifiedBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "var(--color-success-bg)",
    color: "var(--color-success)",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "0.85rem",
    marginTop: "8px",
    border: "1px solid rgba(21, 128, 61, 0.2)",
  },
  lookupErrorBox: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "var(--color-error)",
    fontSize: "0.8rem",
    marginTop: "6px",
  },
  availableBalanceText: {
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
    marginTop: "4px",
    textAlign: "right",
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
  keyRefreshBtn: {
    background: "none",
    border: "none",
    color: "var(--color-accent)",
    cursor: "pointer",
    fontSize: "0.75rem",
    display: "inline-flex",
    alignItems: "center",
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
    fontWeight: "600",
    marginTop: "15px",
  },
  historyCard: {
    padding: "30px",
    display: "flex",
    flexDirection: "column",
  },
  tabBar: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "10px",
  },
  tabBtn: {
    background: "none",
    border: "none",
    padding: "6px 12px",
    fontSize: "0.85rem",
    fontWeight: "500",
    color: "var(--color-text-muted)",
    cursor: "pointer",
    borderRadius: "6px",
    transition: "var(--transition-smooth)",
  },
  activeTabBtn: {
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
  },
  historyContainer: {
    minHeight: "240px",
    maxHeight: "440px",
    overflowY: "auto",
    marginBottom: "20px",
  },
  emptyHistory: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 0",
  },
  historyList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  historyItem: {
    padding: "14px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius)",
    backgroundColor: "var(--color-bg-light)",
    transition: "var(--transition-smooth)",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  debitIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "var(--color-error-bg)",
    color: "var(--color-error)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  creditIcon: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "var(--color-success-bg)",
    color: "var(--color-success)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  txTitle: {
    fontSize: "0.95rem",
    fontWeight: "600",
    color: "var(--color-primary)",
  },
  txId: {
    fontFamily: "monospace",
    fontSize: "0.75rem",
    color: "var(--color-text-muted)",
  },
  txAmount: {
    fontSize: "1.1rem",
    fontWeight: "700",
  },
  txDetails: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.75rem",
    color: "var(--color-text-muted)",
    margin: "6px 0",
  },
  monoId: {
    fontFamily: "monospace",
    color: "var(--color-text-dark)",
  },
  txFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "0.75rem",
    borderTop: "1px dotted var(--color-border)",
    paddingTop: "6px",
    color: "var(--color-text-muted)",
  },
  completedBadge: {
    display: "inline-flex",
    alignItems: "center",
    color: "var(--color-success)",
    fontWeight: "600",
  },
  ledgerInfo: {
    fontSize: "0.8rem",
    lineHeight: "1.5",
    color: "var(--color-text-muted)",
    backgroundColor: "var(--color-accent-light)",
    padding: "12px",
    borderRadius: "var(--border-radius)",
    border: "1px solid rgba(197, 168, 128, 0.25)",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid var(--color-border)",
    borderTopColor: "var(--color-accent)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  }
};
