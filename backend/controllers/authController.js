const User = require("../models/User");
const Cart = require("../models/Cart");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { transporter, sendEmail } = require("../config/nodemailer");
const { generateOTP, sendOTPEmail } = require("../utils/otpUtils");

let refreshTokens = [];
const authController = {
  initiateCustomerSignup: async (req, res) => {
    try {
      const { email, phone } = req.body;

      // Kiểm tra session đã được khởi tạo chưa
      if (!req.session) {
        return res.status(500).json({ error: "Session not initialized" });
      }

      // Kiểm tra email hoặc số điện thoại đã tồn tại chưa
      const existingUser = await User.findOne({
        $or: [{ email }, { phone }],
        role: "customer",
      });

      if (existingUser) {
        return res.status(400).json({
          error: "Email hoặc số điện thoại đã được sử dụng",
        });
      }

      // Tạo và gửi OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

      // Lưu OTP vào session
      req.session.signupOTP = {
        code: otp,
        expires: otpExpires,
        email,
        phone,
        data: req.body,
      };

      // Gửi OTP qua email hoặc SMS
      await sendOTPEmail(email, otp, transporter);

      res.status(200).json({
        message: "OTP đã được gửi đến email của bạn",
        expiresIn: "10 phút",
      });
    } catch (error) {
      console.error("Error in initiateCustomerSignup:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },

  // Xác thực OTP và tạo tài khoản khách hàng - bước 2
  verifyOTPAndCreateCustomer: async (req, res) => {
    try {
      const { otp } = req.body;
      const { signupOTP } = req.session;

      // Kiểm tra OTP
      if (
        !signupOTP ||
        signupOTP.code !== otp ||
        new Date() > signupOTP.expires
      ) {
        return res
          .status(400)
          .json({ error: "OTP không hợp lệ hoặc đã hết hạn" });
      }

      const { username, password, fullName, email, phone, address } =
        signupOTP.data;

      // Tạo người dùng mới
      const newUser = new User({
        username,
        password,
        fullName,
        email,
        phone,
        address,
        role: "customer",
        emailVerified: true,
      });

      const savedUser = await newUser.save();
      // Tạo giỏ hàng trống cho người dùng mới
      const newCart = new Cart({ user: savedUser._id, items: [], total: 0 });
      await newCart.save();
      // Xóa OTP khỏi session sau khi xác thực thành công
      delete req.session.signupOTP;

      // Tạo token và trả về
      const accessToken = authController.generateAccessToken(savedUser);
      const refreshToken = authController.generateRefreshToken(savedUser);
      refreshTokens.push(refreshToken);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      const { password: _, ...userInfo } = savedUser._doc;
      res.status(201).json({ ...userInfo, accessToken });
    } catch (error) {
      console.error("Error in verifyOTPAndCreateCustomer:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },
  createEmployee: async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Không có quyền thực hiện" });
      }

      const { username, fullName, email, phone, role } = req.body;

      // Validate email
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Email không hợp lệ" });
      }

      // Kiểm tra user tồn tại
      const existingUser = await User.findOne({
        $or: [{ username }, { email }],
      });
      if (existingUser) {
        return res.status(400).json({
          error:
            existingUser.username === username
              ? "Username đã tồn tại"
              : "Email đã tồn tại",
        });
      }

      // Tạo mật khẩu
      const randomPassword = crypto.randomBytes(8).toString("hex");
      const salt = await bcrypt.genSalt(10); // Thêm salt
      const hashedPassword = await bcrypt.hash(randomPassword, salt); // Hash với salt

      // Tạo user mới
      const newUser = new User({
        username,
        password: randomPassword,
        fullName,
        email,
        phone,
        role: role || "employee",
        isActive: true,
        emailVerified: true, // Thêm trường này để không cần xác thực email
      });

      const savedUser = await newUser.save();

      // Gửi email
      try {
        const emailContent = `
          <h2>Thông tin tài khoản</h2>
          <p>Xin chào ${fullName},</p>
          <p>Tài khoản nhân viên của bạn đã được tạo:</p>
          <ul>
            <li><strong>Username:</strong> ${username}</li>
            <li><strong>Mật khẩu tạm thời:</strong> ${randomPassword}</li>
          </ul>
          <p>Vui lòng đổi mật khẩu ngay sau khi đăng nhập.</p>
        `;

        await sendEmail({
          to: email.trim(),
          subject: "Tài khoản nhân viên đã được tạo",
          html: emailContent,
        });
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        const { password: _, ...userInfo } = savedUser._doc;
        return res.status(201).json({
          ...userInfo,
          warning: "Tài khoản đã được tạo nhưng không thể gửi email",
        });
      }

      const { password: _, ...userInfo } = savedUser._doc;
      res.status(201).json(userInfo);
    } catch (error) {
      console.error("Error in createEmployee:", error);
      res.status(500).json({
        error: "Lỗi hệ thống",
        details: error.message,
      });
    }
  },
  // Yêu cầu reset mật khẩu (gửi OTP)
  requestPasswordReset: async (req, res) => {
    try {
      const { email } = req.body;

      // Tìm người dùng
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: "Email không tồn tại" });
      }

      // Tạo và gửi OTP
      const otp = generateOTP();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút

      // Lưu OTP reset (trong thực tế nên lưu vào Redis hoặc DB)
      req.session.resetOTP = {
        code: otp,
        expires: otpExpires,
        userId: user._id,
      };

      // Gửi OTP qua email
      await sendOTPEmail(email, otp, transporter);

      res.status(200).json({
        message: "OTP đã được gửi đến email của bạn",
        expiresIn: "10 phút",
      });
    } catch (error) {
      console.error("Error in requestPasswordReset:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },

  verifyOTPAndResetPassword: async (req, res) => {
    try {
      const { otp, newPassword } = req.body;
      const { resetOTP } = req.session;

      // Kiểm tra OTP
      if (!resetOTP || resetOTP.code !== otp || new Date() > resetOTP.expires) {
        return res
          .status(400)
          .json({ error: "OTP không hợp lệ hoặc đã hết hạn" });
      }

      // Tìm user
      const user = await User.findById(resetOTP.userId);
      if (!user) {
        return res.status(404).json({ error: "Người dùng không tồn tại" });
      }

      console.log("User before password change:", user);

      // Gán mật khẩu mới (hook pre-save sẽ tự động hash)
      user.password = newPassword;

      // Lưu user (hook pre-save sẽ chạy)
      await user.save();

      console.log("User after password change:", user);

      // Xóa OTP khỏi session
      delete req.session.resetOTP;

      // Kiểm tra lại trong DB
      const updatedUser = await User.findById(user._id).select("+password");
      console.log("Updated user from DB:", updatedUser);

      res.status(200).json({
        message: "Mật khẩu đã được cập nhật thành công",
        success: true,
      });
    } catch (error) {
      console.error("Error in verifyOTPAndResetPassword:", error);
      res.status(500).json({
        error: "Lỗi hệ thống",
        details: error.message,
      });
    }
  },
  generateAccessToken: (user) => {
    return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
  },

  generateRefreshToken: (user) => {
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
  },
  loginUser: async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await User.findOne({ username }).select("+password");
      if (!user)
        return res.status(400).json({ error: "Tên đăng nhập không tồn tại" });
      if (!user.isActive)
        return res.status(403).json({ error: "Tài khoản đã bị vô hiệu hóa" });
      if (!user.emailVerified && user.role !== "customer")
        // Thêm điều kiện này
        return res.status(403).json({ error: "Tài khoản chưa được xác thực" });
      const validPassword = await user.comparePassword(password);
      if (!validPassword) {
        return res.status(400).json({ error: "Mật khẩu không chính xác" });
      }

      const accessToken = authController.generateAccessToken(user);
      const refreshToken = authController.generateRefreshToken(user);
      refreshTokens.push(refreshToken);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      // Cập nhật last login
      user.lastLogin = new Date();
      await user.save();

      const { password: _, ...userInfo } = user._doc;
      res.status(200).json({ ...userInfo, accessToken });
    } catch (error) {
      console.error("Error in loginUser:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },
  requestRefreshToken: async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: "Không xác thực" });

    if (!refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ error: "Refresh token không hợp lệ" });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
      if (err)
        return res.status(403).json({ error: "Refresh token không hợp lệ" });

      refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

      const newAccessToken = authController.generateAccessToken(user);
      const newRefreshToken = authController.generateRefreshToken(user);
      refreshTokens.push(newRefreshToken);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });

      res.status(200).json({ accessToken: newAccessToken });
    });
  },

  logoutUser: async (req, res) => {
    res.clearCookie("refreshToken");
    refreshTokens = refreshTokens.filter(
      (token) => token !== req.cookies.refreshToken
    );
    res.status(200).json({ message: "Đăng xuất thành công" });
  },

  // Hàm khởi tạo tài khoản admin (chạy một lần khi khởi động hệ thống)
  initializeAdminAccount: async () => {
    try {
      const adminExists = await User.findOne({ role: "admin" });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash("123456", 10);
        const admin = new User({
          username: "admin",
          password: hashedPassword,
          fullName: "Quản trị viên hệ thống",
          email: "admin@store.com",
          role: "admin",
          isActive: true,
          emailVerified: true,
        });
        await admin.save();
        console.log("Tài khoản admin mặc định đã được tạo");
      }
    } catch (error) {
      console.error("Error initializing admin account:", error);
    }
  },
};

module.exports = authController;
