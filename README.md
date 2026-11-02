# 🏦 Apex Horizon Bank & Trust

An advanced, real-world full-stack banking and double-entry transaction system built with **Node.js, Express, MongoDB, and React 19 (Vite)**.

---

## 🌟 Key Architecture & Features

### 1. 📖 Double-Entry Bookkeeping Ledger
- Instead of mutating account balances directly, account balances are dynamically derived from an append-only, immutable **Ledger** via MongoDB aggregation pipelines (`totalCredit - totalDebit`).
- Mathematical integrity is enforced at the schema level using Mongoose pre-hooks that strictly prevent updates or deletions of ledger entries.

### 2. ⚡ Atomic ACID Transfers & Idempotency
- **Multi-Document Transactions**: Money transfers run inside MongoDB session transactions (`session.startTransaction()`), ensuring simultaneous debit and credit entries or a clean rollback upon failure.
- **Idempotency Safeguard**: Every transaction requires a unique `idempotencyKey` to prevent accidental double-spend charges during network retries.

### 3. 🛡️ Authentication & Access Control
- JWT authentication with secure HTTP-only cookies and Bearer token headers.
- Password hashing with `bcryptjs`.
- Token blacklisting on logout backed by a MongoDB TTL index.
- Role-based access control distinguishing Private Clients from Treasury Officers.

### 4. 💳 Client Portal & Banking Operations
- **Real-Time Dashboard**: View live balances, open new accounts, and freeze/unfreeze accounts.
- **Deposit Funds (Add Money)**: Deposit test funds directly into your account with automatic central treasury pairing.
- **Live Recipient Lookup**: Automatically verifies recipient names and account statuses before executing a transfer.
- **Transaction History**: Live database-driven history with filtering for credits and debits.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, MongoDB Atlas (Mongoose), JWT, Bcryptjs, Nodemailer
- **Frontend**: React 19, Vite, React Router v7, Axios, Lucide React
- **Design**: Modern Luxury Wealth Management Theme ("Apex Horizon")

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas cluster or local MongoDB instance

### 1. Clone the repository
```bash
git clone https://github.com/aayushagrawal130/bank-transaction-system.git
cd bank-transaction-system
```

### 2. Backend Setup
```bash
cd backened
npm install
```
Create a `.env` file in `backened` based on `.env.example`:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=3000
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
