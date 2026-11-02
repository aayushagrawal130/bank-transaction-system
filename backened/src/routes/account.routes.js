const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");

const router = express.Router();

/**
 * - POST /api/accounts/
 * - Create a new account
 * - Protected Route
 */
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController);

/**
 * - GET /api/accounts/
 * - Get all accounts of the logged-in user
 * - Protected Route
 */
router.get("/", authMiddleware.authMiddleware, accountController.getUserAccountsController);

/**
 * - GET /api/accounts/lookup/:accountId
 * - Look up recipient name and status before initiating a transfer
 */
router.get("/lookup/:accountId", authMiddleware.authMiddleware, accountController.lookupAccountController);

/**
 * - GET /api/accounts/balance/:accountId
 * - Derive balance from ledger
 */
router.get("/balance/:accountId", authMiddleware.authMiddleware, accountController.getAccountBalanceController);

/**
 * - PATCH /api/accounts/:accountId/status
 * - Freeze, Unfreeze, or Close account
 */
router.patch("/:accountId/status", authMiddleware.authMiddleware, accountController.updateAccountStatusController);

module.exports = router;
