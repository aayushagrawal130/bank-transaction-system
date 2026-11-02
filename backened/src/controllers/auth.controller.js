const userModel = require("../model/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlackListModel = require("../model/blackList.model");

async function userRegisterController(req, res) {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        const isExists = await userModel.findOne({ email });

        if (isExists) {
            return res.status(422).json({
                message: "User already exists with this email address.",
                status: "failed"
            });
        }

        const user = await userModel.create({
            email,
            password,
            name
        });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });

        // Non-blocking welcome email
        try {
            emailService.sendRegistrationEmail(user.email, user.name)
                .catch(err => console.warn("Welcome email notice warning:", err.message));
        } catch (e) {
            // Non-blocking
        }

        return res.status(201).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        });
    } catch (err) {
        console.error("Registration error:", err);
        return res.status(500).json({
            message: err.message || "Registration failed"
        });
    }
}

async function userLoginController(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const user = await userModel.findOne({ email }).select("+password +systemUser");

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isValidPassword = await user.comparePassword(password);

        if (!isValidPassword) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });

        return res.status(200).json({
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                systemUser: user.systemUser || false
            },
            token
        });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({
            message: "Login failed"
        });
    }
}

async function userLogoutController(req, res) {
    try {
        const token = req.cookies?.token || req.headers.authorization?.split(" ")[ 1 ];

        if (token) {
            await tokenBlackListModel.create({ token }).catch(() => {});
        }

        res.clearCookie("token");

        return res.status(200).json({
            message: "User logged out successfully"
        });
    } catch (err) {
        console.error("Logout error:", err);
        res.clearCookie("token");
        return res.status(200).json({
            message: "User logged out successfully"
        });
    }
}

async function getCurrentUserController(req, res) {
    try {
        const user = await userModel.findById(req.user._id).select("+systemUser");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                systemUser: user.systemUser || false,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        console.error("Get current user error:", err);
        return res.status(500).json({ message: "Failed to fetch user profile" });
    }
}

async function changePasswordController(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Both current password and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "New password must contain at least 6 characters"
            });
        }

        const user = await userModel.findById(req.user._id).select("+password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({
                message: "Current password does not match"
            });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            message: "Password changed successfully"
        });
    } catch (err) {
        console.error("Change password error:", err);
        return res.status(500).json({
            message: "Failed to change password"
        });
    }
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController,
    getCurrentUserController,
    changePasswordController
};
