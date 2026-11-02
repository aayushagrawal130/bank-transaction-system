const accountModel = require("../model/account.model");
const mongoose = require("mongoose");

async function createAccountController(req, res) {
    try {
        const user = req.user;

        const account = await accountModel.create({
            user: user._id
        });

        return res.status(201).json({
            account
        });
    } catch (err) {
        console.error("Error creating account:", err);
        return res.status(500).json({ message: "Failed to create account" });
    }
}

async function getUserAccountsController(req, res) {
    try {
        const accounts = await accountModel.find({ user: req.user._id }).sort({ createdAt: -1 });

        return res.status(200).json({
            accounts
        });
    } catch (err) {
        console.error("Error fetching user accounts:", err);
        return res.status(500).json({ message: "Failed to fetch accounts" });
    }
}

async function getAccountBalanceController(req, res) {
    try {
        const { accountId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(accountId)) {
            return res.status(400).json({ message: "Invalid account ID format" });
        }

        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({
                message: "Account not found or unauthorized"
            });
        }

        const balance = await account.getBalance();

        return res.status(200).json({
            accountId: account._id,
            balance: balance
        });
    } catch (err) {
        console.error("Error calculating account balance:", err);
        return res.status(500).json({ message: "Failed to calculate balance" });
    }
}

/**
 * - Look up recipient account by ID to verify receiver's identity before transferring
 */
async function lookupAccountController(req, res) {
    try {
        const { accountId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(accountId)) {
            return res.status(400).json({ message: "Invalid account ID format" });
        }

        const account = await accountModel.findById(accountId).populate("user", "name email");

        if (!account) {
            return res.status(404).json({ message: "Account does not exist" });
        }

        return res.status(200).json({
            account: {
                _id: account._id,
                status: account.status,
                currency: account.currency,
                userName: account.user?.name || "Private Client",
                isSelf: account.user?._id?.toString() === req.user._id.toString()
            }
        });
    } catch (err) {
        console.error("Error looking up account:", err);
        return res.status(500).json({ message: "Failed to lookup account" });
    }
}

/**
 * - Update account status (FREEZE, UNFREEZE, CLOSE)
 */
async function updateAccountStatusController(req, res) {
    try {
        const { accountId } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(accountId)) {
            return res.status(400).json({ message: "Invalid account ID format" });
        }

        if (![ "ACTIVE", "FROZEN", "CLOSED" ].includes(status)) {
            return res.status(400).json({
                message: "Status can only be updated to ACTIVE, FROZEN, or CLOSED"
            });
        }

        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({ message: "Account not found or unauthorized" });
        }

        if (account.status === "CLOSED") {
            return res.status(400).json({ message: "Closed accounts cannot be modified" });
        }

        account.status = status;
        await account.save();

        return res.status(200).json({
            message: `Account status updated to ${status} successfully`,
            account
        });
    } catch (err) {
        console.error("Error updating account status:", err);
        return res.status(500).json({ message: "Failed to update account status" });
    }
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    lookupAccountController,
    updateAccountStatusController
};
