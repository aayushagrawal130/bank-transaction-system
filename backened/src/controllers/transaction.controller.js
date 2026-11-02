const transactionModel = require("../model/transaction.model")
const ledgerModel = require("../model/ledger.model")
const accountModel = require("../model/account.model")
const userModel = require("../model/user.model")
const emailService = require("../services/email.service")
const mongoose = require("mongoose")

/**
 * - Create a new transaction
 * ATOMIC TRANSFER FLOW:
 * 1. Validate request and parameters (positive amount, distinct accounts, valid ObjectIds)
 * 2. Validate sender ownership (ensure fromAccount belongs to req.user._id)
 * 3. Validate idempotency key
 * 4. Check sender and receiver account status (must be ACTIVE)
 * 5. Derive sender balance from ledger to verify sufficient funds
 * 6. Begin MongoDB atomic transaction session
 * 7. Create PENDING transaction
 * 8. Create DEBIT ledger entry
 * 9. Create CREDIT ledger entry
 * 10. Mark transaction COMPLETED and commit session
 * 11. Send email notification (non-blocking)
 */

async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    // 1. Validate request parameters
    if (!fromAccount || !toAccount || amount === undefined || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount, toAccount, amount and idempotencyKey are required"
        })
    }

    if (!mongoose.Types.ObjectId.isValid(fromAccount) || !mongoose.Types.ObjectId.isValid(toAccount)) {
        return res.status(400).json({
            message: "Invalid account ID format"
        })
    }

    if (fromAccount === toAccount) {
        return res.status(400).json({
            message: "Sender and recipient accounts cannot be the same"
        })
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            message: "Transfer amount must be a positive number greater than zero"
        })
    }

    // 2. Validate idempotency key first to avoid duplicate processing
    const isTransactionAlreadyExists = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (isTransactionAlreadyExists) {
        if (isTransactionAlreadyExists.status === "COMPLETED") {
            return res.status(200).json({
                message: "Transaction already processed",
                transaction: isTransactionAlreadyExists
            })
        }

        if (isTransactionAlreadyExists.status === "PENDING") {
            return res.status(200).json({
                message: "Transaction is currently being processed",
                transaction: isTransactionAlreadyExists
            })
        }

        if (isTransactionAlreadyExists.status === "FAILED") {
            return res.status(500).json({
                message: "Prior attempt failed, please generate a new idempotency key to retry"
            })
        }

        if (isTransactionAlreadyExists.status === "REVERSED") {
            return res.status(500).json({
                message: "Transaction was reversed, please retry with a new key"
            })
        }
    }

    // 3. Security: Check that fromAccount belongs to the logged-in user!
    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(403).json({
            message: "Sender account not found or you are not authorized to transfer from it"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    })

    if (!toUserAccount) {
        return res.status(404).json({
            message: "Recipient account does not exist"
        })
    }

    // 4. Check account status
    if (fromUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: `Your account is ${fromUserAccount.status}. Transfers can only be made from ACTIVE accounts.`
        })
    }

    if (toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: `Recipient account is ${toUserAccount.status}. Transfers can only be sent to ACTIVE accounts.`
        })
    }

    // 5. Derive sender balance from ledger
    const balance = await fromUserAccount.getBalance()
    if (balance < numericAmount) {
        return res.status(400).json({
            message: `Insufficient balance. Available balance: ${balance}, Requested amount: ${numericAmount}`
        })
    }

    // 6. Execute atomic transfer with full rollback protection
    const session = await mongoose.startSession()
    let transaction

    try {
        session.startTransaction()

        transaction = (await transactionModel.create([ {
            fromAccount,
            toAccount,
            amount: numericAmount,
            idempotencyKey,
            status: "PENDING"
        } ], { session }))[ 0 ]

        // DEBIT sender account
        await ledgerModel.create([ {
            account: fromAccount,
            amount: numericAmount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        // CREDIT recipient account
        await ledgerModel.create([ {
            account: toAccount,
            amount: numericAmount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

        // Mark COMPLETED
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )

        await session.commitTransaction()
    } catch (error) {
        await session.abortTransaction()
        console.error("Transaction execution error:", error)
        return res.status(500).json({
            message: "Transaction failed and was safely rolled back. No funds were deducted.",
            error: error.message
        })
    } finally {
        session.endSession()
    }

    // 7. Non-blocking email notification
    try {
        emailService.sendTransactionEmail(req.user.email, req.user.name, numericAmount, toAccount)
            .catch(err => console.warn("Email notice warning:", err.message))
    } catch (e) {
        // Log silently to not disrupt HTTP response
    }

    return res.status(201).json({
        message: "Transaction completed successfully",
        transaction
    })
}

/**
 * - Get all transactions associated with user's accounts
 * Supports pagination, populating sender/receiver and user info
 */
async function getUserTransactions(req, res) {
    try {
        const userAccounts = await accountModel.find({ user: req.user._id }).select("_id")
        const accountIds = userAccounts.map(a => a._id)

        const page = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15))
        const skip = (page - 1) * limit

        const filter = {
            $or: [
                { fromAccount: { $in: accountIds } },
                { toAccount: { $in: accountIds } }
            ]
        }

        const total = await transactionModel.countDocuments(filter)
        const transactions = await transactionModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "fromAccount",
                select: "user status currency",
                populate: { path: "user", select: "name email" }
            })
            .populate({
                path: "toAccount",
                select: "user status currency",
                populate: { path: "user", select: "name email" }
            })

        return res.status(200).json({
            transactions,
            accountIds: accountIds.map(id => id.toString()),
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        })
    } catch (err) {
        console.error("Error retrieving user transactions:", err)
        return res.status(500).json({ message: "Failed to retrieve transaction history" })
    }
}

/**
 * - Get single transaction details
 */
async function getTransactionById(req, res) {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid transaction ID format" })
        }

        const userAccounts = await accountModel.find({ user: req.user._id }).select("_id")
        const accountIds = userAccounts.map(a => a._id.toString())

        const transaction = await transactionModel.findById(id)
            .populate({
                path: "fromAccount",
                select: "user currency status",
                populate: { path: "user", select: "name email" }
            })
            .populate({
                path: "toAccount",
                select: "user currency status",
                populate: { path: "user", select: "name email" }
            })

        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" })
        }

        const isUserParty = accountIds.includes(transaction.fromAccount?._id?.toString()) ||
                           accountIds.includes(transaction.toAccount?._id?.toString())

        if (!isUserParty && !req.user.systemUser) {
            return res.status(403).json({ message: "Unauthorized to view this transaction" })
        }

        return res.status(200).json({ transaction })
    } catch (err) {
        console.error("Error retrieving transaction:", err)
        return res.status(500).json({ message: "Failed to fetch transaction details" })
    }
}

/**
 * - System user initial reserve funding
 */
async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    if (!mongoose.Types.ObjectId.isValid(toAccount)) {
        return res.status(400).json({ message: "Invalid toAccount ID format" })
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: "Amount must be a positive number" })
    }

    const toUserAccount = await accountModel.findOne({ _id: toAccount })
    if (!toUserAccount) {
        return res.status(404).json({ message: "Invalid toAccount" })
    }

    const fromUserAccount = await accountModel.findOne({ user: req.user._id })
    if (!fromUserAccount) {
        return res.status(400).json({ message: "System user reserve account not found" })
    }

    const session = await mongoose.startSession()
    let transaction

    try {
        session.startTransaction()

        transaction = (await transactionModel.create([ {
            fromAccount: fromUserAccount._id,
            toAccount,
            amount: numericAmount,
            idempotencyKey,
            status: "PENDING"
        } ], { session }))[ 0 ]

        await ledgerModel.create([ {
            account: fromUserAccount._id,
            amount: numericAmount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        await ledgerModel.create([ {
            account: toAccount,
            amount: numericAmount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )

        await session.commitTransaction()
    } catch (err) {
        await session.abortTransaction()
        console.error("Error creating initial funds:", err)
        return res.status(500).json({
            message: "Initial funding failed and was safely rolled back",
            error: err.message
        })
    } finally {
        session.endSession()
    }

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction
    })
}

/**
 * - Deposit Funds into user's account
 * Automatically pairs with the central treasury reserve in the double-entry ledger
 */
async function depositFunds(req, res) {
    const { accountId, amount } = req.body

    if (!accountId || amount === undefined) {
        return res.status(400).json({ message: "accountId and amount are required" })
    }

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({ message: "Invalid account ID format" })
    }

    const numericAmount = Number(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: "Deposit amount must be a positive number greater than zero" })
    }

    const userAccount = await accountModel.findOne({
        _id: accountId,
        user: req.user._id
    })

    if (!userAccount) {
        return res.status(404).json({ message: "Account not found or does not belong to you" })
    }

    if (userAccount.status !== "ACTIVE") {
        return res.status(400).json({ message: `Cannot deposit into an account with status ${userAccount.status}` })
    }

    // Get or create Treasury Reserve Account
    let treasuryUser = await userModel.findOne({ email: "treasury@apexhorizon.bank" })
    if (!treasuryUser) {
        treasuryUser = await userModel.create({
            name: "Apex Horizon Treasury",
            email: "treasury@apexhorizon.bank",
            password: "SystemTreasurySecretPassword2026!",
            systemUser: true
        })
    }

    let treasuryAccount = await accountModel.findOne({ user: treasuryUser._id })
    if (!treasuryAccount) {
        treasuryAccount = await accountModel.create({
            user: treasuryUser._id,
            status: "ACTIVE",
            currency: "INR"
        })
    }

    const session = await mongoose.startSession()
    let transaction

    try {
        session.startTransaction()

        const idempotencyKey = "dep_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9)

        transaction = (await transactionModel.create([ {
            fromAccount: treasuryAccount._id,
            toAccount: userAccount._id,
            amount: numericAmount,
            idempotencyKey,
            status: "PENDING"
        } ], { session }))[ 0 ]

        // Debit Central Treasury
        await ledgerModel.create([ {
            account: treasuryAccount._id,
            amount: numericAmount,
            transaction: transaction._id,
            type: "DEBIT"
        } ], { session })

        // Credit User Account
        await ledgerModel.create([ {
            account: userAccount._id,
            amount: numericAmount,
            transaction: transaction._id,
            type: "CREDIT"
        } ], { session })

        // Complete transaction
        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        )

        await session.commitTransaction()
    } catch (err) {
        await session.abortTransaction()
        console.error("Deposit error:", err)
        return res.status(500).json({ message: "Deposit transaction failed and was safely rolled back", error: err.message })
    } finally {
        session.endSession()
    }

    const newBalance = await userAccount.getBalance()

    return res.status(200).json({
        message: `Successfully deposited INR ${numericAmount.toLocaleString('en-IN')} into your account!`,
        newBalance,
        transaction
    })
}

module.exports = {
    createTransaction,
    getUserTransactions,
    getTransactionById,
    createInitialFundsTransaction,
    depositFunds
}
