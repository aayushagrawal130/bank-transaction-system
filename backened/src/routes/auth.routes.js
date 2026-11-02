const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", authController.userRegisterController);
router.post("/login", authController.userLoginController);
router.post("/logout", authController.userLogoutController);

/**
 * - GET /api/auth/me
 * - Return current authenticated user profile
 */
router.get("/me", authMiddleware.authMiddleware, authController.getCurrentUserController);

/**
 * - PUT /api/auth/change-password
 * - Change user password
 */
router.put("/change-password", authMiddleware.authMiddleware, authController.changePasswordController);

module.exports = router;
