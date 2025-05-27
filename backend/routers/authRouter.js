const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// Đăng ký khách hàng (cần OTP)
router.post("/initiate-customer-signup", authController.initiateCustomerSignup);
router.post("/verify-customer-signup", authController.verifyOTPAndCreateCustomer);

// Tạo tài khoản nhân viên (chỉ admin)
router.post(
  "/create-employee",
  authMiddleware.protect,
  authMiddleware.restrictTo("admin"),
  authController.createEmployee
);

// Đăng nhập, đăng xuất
router.post("/login", authController.loginUser);
router.post("/logout", authController.logoutUser);

// Refresh token
router.post("/refresh", authController.requestRefreshToken);

// Quên mật khẩu
router.post("/request-password-reset", authController.requestPasswordReset);
router.post("/verify-reset-password", authController.verifyOTPAndResetPassword);

module.exports = router;