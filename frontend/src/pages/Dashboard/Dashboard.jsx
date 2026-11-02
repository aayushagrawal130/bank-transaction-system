import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, Wallet, Award, ArrowUpRight, Lock, Unlock, 
  RefreshCw, AlertCircle, CheckCircle, PlusCircle, X, Coins 
} from "lucide-react";
import API from "../../api";

export default function Dashboard({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  // Deposit Modal State
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [depositAmount, setDepositAmount] = useState("10000");
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState("");

  const fetchAccountsAndBalances = async () => {
    try {
      setLoading(true);
      setError("");
      
      const accountsRes = await API.get("/accounts");
      const accountsList = accountsRes.data.accounts || [];
      setAccounts(accountsList);

      // Fetch balances for all accounts concurrently
      const balancePromises = accountsList.map(async (acc) => {
        try {
          const balRes = await API.get(`/accounts/balance/${acc._id}`);
          return { id: acc._id, balance: balRes.data.balance };
        } catch (err) {
          console.error(`Failed to fetch balance for account ${acc._id}:`, err);
          return { id: acc._id, balance: 0, error: true };
        }
      });

      const balanceResults = await Promise.all(balancePromises);
      const balanceMap = {};
      balanceResults.forEach((result) => {
        balanceMap[result.id] = result.balance;
      });
      setBalances(balanceMap);

    } catch (err) {
      console.error("Dashboard data load error:", err);
      setError("Failed to load accounts. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndBalances();
  }, []);

  const handleCreateAccount = async () => {
    setCreatingAccount(true);
    setError("");
    setSuccessMessage("");
    try {
      await API.post("/accounts", {});
      setSuccessMessage("New private client account opened successfully.");
      await fetchAccountsAndBalances();
    } catch (err) {
      console.error("Account creation failed:", err);
      setError("Failed to open a new account. Please try again.");
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleToggleFreeze = async (accountId, currentStatus) => {
    const newStatus = currentStatus === "ACTIVE" ? "FROZEN" : "ACTIVE";
    setStatusUpdating(prev => ({ ...prev, [accountId]: true }));
    setError("");
    setSuccessMessage("");

    try {
      await API.patch(`/accounts/${accountId}/status`, { status: newStatus });
      setSuccessMessage(`Account ${accountId.slice(0, 8)}... has been ${newStatus === "FROZEN" ? "FROZEN" : "REACTIVATED"}.`);
      setAccounts(prev => prev.map(acc => acc._id === accountId ? { ...acc, status: newStatus } : acc));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update account status.");
    } finally {
      setStatusUpdating(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const openDepositModal = (accId) => {
    setSelectedAccountId(accId || (accounts[0]?._id ?? ""));
    setDepositAmount("10000");
    setDepositError("");
    setDepositModalOpen(true);
  };

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    setDepositError("");

    const numericAmount = parseFloat(depositAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setDepositError("Please enter a valid positive deposit amount.");
      return;
    }

    if (!selectedAccountId) {
      setDepositError("Please choose an account to deposit into.");
      return;
    }

    setDepositing(true);
    try {
      const res = await API.post("/transactions/deposit", {
        accountId: selectedAccountId,
        amount: numericAmount
      });

      setSuccessMessage(res.data?.message || `Successfully deposited ₹${numericAmount.toLocaleString('en-IN')}!`);
      setDepositModalOpen(false);
      await fetchAccountsAndBalances();
    } catch (err) {
      console.error("Deposit error:", err);
      setDepositError(err.response?.data?.message || "Deposit transaction failed. Please retry.");
    } finally {
      setDepositing(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "ACTIVE":
        return styles.statusActive;
      case "FROZEN":
        return styles.statusFrozen;
      case "CLOSED":
        return styles.statusClosed;
      default:
        return {};
    }
  };

  const formatBalance = (amount, currency = "INR") => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div style={styles.container}>
      {/* Header Panel */}
      <div style={styles.headerPanel}>
        <div>
          <h1 className="serif-title" style={styles.welcomeTitle}>Welcome back, {user?.name}</h1>
          <p style={styles.welcomeSubtitle}>Apex Horizon Real-Time Double-Entry Wealth Ledgers</p>
        </div>
        
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {accounts.length > 0 && (
            <button 
              onClick={() => openDepositModal(accounts[0]?._id)}
              className="btn btn-accent"
              style={{ fontWeight: "700" }}
              title="Deposit test funds into your account"
            >
              <Coins size={17} style={{ marginRight: 6 }} />
              Add Money
            </button>
          )}

          <button 
            onClick={fetchAccountsAndBalances} 
            className="btn btn-outline-gold"
            disabled={loading}
            title="Refresh Ledger"
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} style={{ marginRight: 6 }} />
            Refresh
          </button>
          <button 
            onClick={handleCreateAccount} 
            className="btn btn-primary" 
            disabled={creatingAccount}
            style={styles.newAccountBtn}
          >
            <Plus size={18} style={{ marginRight: 6 }} />
            {creatingAccount ? "Opening..." : "New Account"}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div style={styles.grid}>
        {/* Left Side: Accounts List */}
        <div style={styles.mainCol}>
          <h3 style={styles.sectionTitle}>Your Client Accounts</h3>
          {loading ? (
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <span>Retrieving secure ledger data...</span>
            </div>
          ) : accounts.length === 0 ? (
            <div style={styles.emptyState}>
              <Wallet size={48} color="var(--color-accent)" style={{ marginBottom: 15 }} />
              <h4>No Active Accounts Found</h4>
              <p style={{ color: "var(--color-text-muted)", marginBottom: 20 }}>
                You have not opened any ledger accounts yet. Establish your first account to start sending and receiving funds.
              </p>
              <button onClick={handleCreateAccount} className="btn btn-primary" disabled={creatingAccount}>
                Create Your First Account
              </button>
            </div>
          ) : (
            <div style={styles.accountsList}>
              {accounts.map((acc) => (
                <div key={acc._id} className="card" style={styles.accountCard}>
                  <div style={styles.accountCardHeader}>
                    <div>
                      <div style={styles.accountName}>
                        Private Client Account
                        <span style={{ ...styles.statusBadge, ...getStatusStyle(acc.status) }}>
                          {acc.status}
                        </span>
                      </div>
                      <div style={styles.accountId}>
                        Account ID: <strong>{acc._id}</strong>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      {acc.status === "ACTIVE" && (
                        <button
                          onClick={() => openDepositModal(acc._id)}
                          className="btn btn-accent"
                          style={styles.depositBtn}
                          title="Add funds to this account"
                        >
                          <Coins size={14} style={{ marginRight: 4 }} />
                          Add Money
                        </button>
                      )}

                      {acc.status !== "CLOSED" && (
                        <button
                          onClick={() => handleToggleFreeze(acc._id, acc.status)}
                          className="btn btn-outline-gold"
                          style={styles.freezeBtn}
                          disabled={statusUpdating[acc._id]}
                          title={acc.status === "ACTIVE" ? "Freeze account transfers" : "Unfreeze account"}
                        >
                          {acc.status === "ACTIVE" ? (
                            <>
                              <Lock size={14} style={{ marginRight: 4 }} />
                              Freeze
                            </>
                          ) : (
                            <>
                              <Unlock size={14} style={{ marginRight: 4 }} />
                              Unfreeze
                            </>
                          )}
                        </button>
                      )}

                      <Link 
                        to={`/transactions?fromAccount=${acc._id}`} 
                        className="btn btn-primary" 
                        style={styles.actionBtn}
                      >
                        Transfer
                        <ArrowUpRight size={16} style={{ marginLeft: 4 }} />
                      </Link>
                    </div>
                  </div>
                  
                  <div style={styles.balanceContainer}>
                    <div style={styles.balanceLabel}>Derived Ledger Balance</div>
                    <div style={styles.balanceValue}>
                      {formatBalance(balances[acc._id] ?? 0, acc.currency)}
                    </div>
                  </div>
                  
                  <div style={styles.cardFooter}>
                    <span>Currency: <strong>{acc.currency}</strong></span>
                    <span>Created: {new Date(acc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Quick Actions & Help Card */}
        <div style={styles.sideCol}>
          <div className="card" style={styles.infoCard}>
            <Award size={36} color="var(--color-accent)" style={{ marginBottom: 15 }} />
            <h4 style={styles.infoCardTitle}>Double-Entry Ledger Security</h4>
            <p style={styles.infoCardText}>
              Apex Horizon operates on a dual-entry immutable ledger system. Every single transaction you authorize writes an instantaneous debit and credit entry directly into our database vaults, guaranteeing complete mathematical integrity.
            </p>
          </div>

          <div className="card" style={styles.quickActionsCard}>
            <h4 style={{ marginBottom: 15, fontSize: "1.1rem" }}>Quick Actions</h4>
            <div style={styles.quickLinksList}>
              {accounts.length > 0 && (
                <button 
                  onClick={() => openDepositModal(accounts[0]?._id)}
                  style={{ ...styles.quickLinkItem, background: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Coins size={16} color="var(--color-accent)" />
                    Deposit Funds (Add Money)
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              )}
              <Link to="/transactions" style={styles.quickLinkItem}>
                <span>Make a Secure Transfer</span>
                <ArrowUpRight size={16} />
              </Link>
              <Link to="/transactions#history" style={styles.quickLinkItem}>
                <span>View Full Transaction History</span>
                <ArrowUpRight size={16} />
              </Link>
              {user?.systemUser && (
                <Link to="/system-admin" style={styles.quickLinkItem}>
                  <span>Treasury Reserve Management</span>
                  <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deposit Funds Modal */}
      {depositModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setDepositModalOpen(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={styles.modalIcon}>
                  <Coins size={22} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 style={styles.modalTitle}>Deposit Funds</h3>
                  <span style={styles.modalSubtitle}>Credit central treasury reserves into account</span>
                </div>
              </div>
              <button 
                onClick={() => setDepositModalOpen(false)} 
                style={styles.closeBtn}
                disabled={depositing}
              >
                <X size={20} />
              </button>
            </div>

            {depositError && (
              <div className="alert alert-error" style={{ fontSize: "0.85rem", marginBottom: "15px" }}>
                <AlertCircle size={16} />
                <span>{depositError}</span>
              </div>
            )}

            <form onSubmit={handleDepositSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Destination Account</label>
                <select 
                  className="form-input"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  disabled={depositing}
                  required
                >
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      Account {acc._id.slice(0, 8)}... (Balance: {formatBalance(balances[acc._id] ?? 0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: "0.8rem" }}>Deposit Amount (INR)</label>
                <input 
                  type="number"
                  step="1"
                  min="1"
                  className="form-input"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 10000"
                  disabled={depositing}
                  required
                />
              </div>

              {/* Quick Select Amount Chips */}
              <div style={styles.chipsRow}>
                {[ 1000, 5000, 10000, 25000, 50000, 100000 ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    style={{
                      ...styles.chipBtn,
                      ...(depositAmount === String(chip) ? styles.activeChipBtn : {})
                    }}
                    onClick={() => setDepositAmount(String(chip))}
                    disabled={depositing}
                  >
                    +₹{chip.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>

              <div style={styles.ledgerNotice}>
                <Award size={16} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                <span>
                  This deposit writes a verified <strong>CREDIT</strong> to your account ledger and an equal <strong>DEBIT</strong> to the Apex Horizon Treasury Vault.
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-accent"
                style={styles.modalSubmitBtn}
                disabled={depositing}
              >
                {depositing ? (
                  <>
                    <RefreshCw className="spin" size={16} style={{ marginRight: 8 }} />
                    Committing Ledger Credit...
                  </>
                ) : (
                  `Deposit ₹${parseFloat(depositAmount || 0).toLocaleString('en-IN')} Now`
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px",
  },
  headerPanel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "35px",
    borderBottom: "1px solid var(--color-border)",
    paddingBottom: "25px",
    flexWrap: "wrap",
    gap: "15px",
  },
  welcomeTitle: {
    fontSize: "2.2rem",
    fontWeight: "400",
    color: "var(--color-primary)",
    fontFamily: "var(--font-display)",
  },
  welcomeSubtitle: {
    color: "var(--color-text-muted)",
    fontSize: "1rem",
    marginTop: "4px",
  },
  newAccountBtn: {
    padding: "10px 20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "35px",
  },
  mainCol: {
    display: "flex",
    flexDirection: "column",
  },
  sectionTitle: {
    fontSize: "1.2rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-text-muted)",
    marginBottom: "20px",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 0",
    gap: "15px",
    color: "var(--color-text-muted)",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--color-border)",
    borderTopColor: "var(--color-accent)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 40px",
    border: "2px dashed var(--color-border)",
    borderRadius: "8px",
  },
  accountsList: {
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },
  accountCard: {
    padding: "24px",
    borderLeft: "4px solid var(--color-accent)",
  },
  accountCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "15px",
    flexWrap: "wrap",
    gap: "10px",
  },
  accountName: {
    fontSize: "1.1rem",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "var(--color-primary)",
  },
  accountId: {
    fontFamily: "monospace",
    fontSize: "0.85rem",
    color: "var(--color-text-muted)",
    marginTop: "4px",
  },
  statusBadge: {
    fontSize: "0.7rem",
    padding: "4px 8px",
    borderRadius: "100px",
    fontWeight: "700",
    letterSpacing: "0.05em",
  },
  statusActive: {
    backgroundColor: "var(--color-success-bg)",
    color: "var(--color-success)",
  },
  statusFrozen: {
    backgroundColor: "var(--color-warning-bg)",
    color: "var(--color-warning)",
  },
  statusClosed: {
    backgroundColor: "var(--color-error-bg)",
    color: "var(--color-error)",
  },
  depositBtn: {
    padding: "8px 12px",
    fontSize: "0.8rem",
    fontWeight: "600",
  },
  freezeBtn: {
    padding: "8px 12px",
    fontSize: "0.8rem",
  },
  actionBtn: {
    padding: "8px 14px",
    fontSize: "0.85rem",
  },
  balanceContainer: {
    margin: "15px 0 20px 0",
  },
  balanceLabel: {
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-text-muted)",
  },
  balanceValue: {
    fontSize: "2.2rem",
    fontWeight: "600",
    fontFamily: "var(--font-sans)",
    color: "var(--color-primary)",
    marginTop: "4px",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "1px solid var(--color-border)",
    paddingTop: "15px",
    fontSize: "0.8rem",
    color: "var(--color-text-muted)",
  },
  sideCol: {
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },
  infoCard: {
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    borderColor: "var(--color-primary)",
  },
  infoCardTitle: {
    color: "var(--color-white)",
    fontSize: "1.1rem",
    marginBottom: "10px",
  },
  infoCardText: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: "0.9rem",
    lineHeight: "1.6",
  },
  quickActionsCard: {
    padding: "24px",
  },
  quickLinksList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  quickLinkItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--border-radius)",
    fontSize: "0.9rem",
    fontWeight: "500",
    transition: "var(--transition-smooth)",
    color: "var(--color-primary)",
  },
  // Modal styles
  modalBackdrop: {
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
  modalCard: {
    backgroundColor: "var(--color-white)",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "460px",
    padding: "28px",
    boxShadow: "var(--shadow-lg)",
    border: "1px solid var(--color-border)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid var(--color-border)",
  },
  modalIcon: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "var(--color-accent-light)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "var(--color-primary)",
  },
  modalSubtitle: {
    fontSize: "0.75rem",
    color: "var(--color-text-muted)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--color-text-muted)",
    padding: "4px",
  },
  chipsRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  chipBtn: {
    backgroundColor: "var(--color-bg-light)",
    border: "1px solid var(--color-border)",
    borderRadius: "100px",
    padding: "5px 12px",
    fontSize: "0.8rem",
    fontWeight: "600",
    color: "var(--color-primary)",
    cursor: "pointer",
    transition: "var(--transition-smooth)",
  },
  activeChipBtn: {
    backgroundColor: "var(--color-primary)",
    color: "var(--color-white)",
    borderColor: "var(--color-primary)",
  },
  ledgerNotice: {
    display: "flex",
    gap: "10px",
    backgroundColor: "var(--color-accent-light)",
    color: "var(--color-primary)",
    padding: "12px 14px",
    borderRadius: "6px",
    fontSize: "0.8rem",
    lineHeight: "1.4",
    marginBottom: "20px",
    border: "1px solid rgba(197, 168, 128, 0.3)",
  },
  modalSubmitBtn: {
    width: "100%",
    padding: "12px",
    fontSize: "1rem",
    fontWeight: "700",
  }
};
