const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const transactionController = require("../controllers/transaction.controller");

const transactionRoutes = Router();

/**
 * - GET /api/transactions/
 * - Fetch paginated transaction history for the logged-in user
 */
transactionRoutes.get("/", authMiddleware.authMiddleware, transactionController.getUserTransactions);

/**
 * - GET /api/transactions/:id
 * - Fetch specific transaction details/receipt
 */
transactionRoutes.get("/:id", authMiddleware.authMiddleware, transactionController.getTransactionById);

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */
transactionRoutes.post("/", authMiddleware.authMiddleware, transactionController.createTransaction);

/**
 * - POST /api/transactions/deposit
 * - Deposit funds directly into user's account (central treasury credit)
 */
transactionRoutes.post("/deposit", authMiddleware.authMiddleware, transactionController.depositFunds);

/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */
transactionRoutes.post("/system/initial-funds", authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction);

module.exports = transactionRoutes;
