const User = require("../models/User");
const bcrypt = require("bcrypt");

const userController = {
  // Lấy tất cả người dùng (admin và employee)
  getAllUsers: async (req, res) => {
    try {
      const { role } = req.query;
      const filter = role ? { role } : {};

      const users = await User.find(filter).select("-password");
      res.status(200).json(users);
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },

  // Lấy thông tin người dùng bằng ID (admin và employee có thể xem thông tin của chính mình)
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;

      // Kiểm tra quyền truy cập: admin có thể xem tất cả, employee chỉ xem được của mình
      if (req.user.role !== "admin" && req.user._id.toString() !== id) {
        return res.status(403).json({ error: "Không có quyền truy cập" });
      }

      const user = await User.findById(id).select("-password");
      if (!user) {
        return res.status(404).json({ error: "Người dùng không tồn tại" });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error("Error in getUserById:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },

  // Cập nhật thông tin người dùng (admin và employee có thể cập nhật thông tin của chính mình)
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        fullName,
        email,
        phone,
        address,
        username,
        password,
        role,
        isActive,
      } = req.body;

      // Kiểm tra quyền: admin được cập nhật tất cả, employee chỉ được cập nhật thông tin của mình
      if (req.user.role !== "admin" && req.user._id.toString() !== id) {
        return res.status(403).json({ error: "Không có quyền cập nhật" });
      }

      let updateData = { fullName, email, phone, address, username };

      // Chỉ admin được phép thay đổi role và isActive
      if (req.user.role === "admin") {
        updateData = { ...updateData, role, isActive };
      }

      // Nếu có password mới
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
        updateData.passwordChangedAt = Date.now();
      }

      const updatedUser = await User.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!updatedUser) {
        return res.status(404).json({ error: "Người dùng không tồn tại" });
      }

      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error in updateUser:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },

  // Xóa người dùng (chỉ admin)
  deleteUser: async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Không có quyền thực hiện" });
      }

      const { id } = req.params;

      // Không cho xóa admin
      const user = await User.findById(id);
      if (user && user.role === "admin") {
        return res.status(403).json({ error: "Không thể xóa tài khoản admin" });
      }

      const deletedUser = await User.findByIdAndDelete(id);
      if (!deletedUser) {
        return res.status(404).json({ error: "Người dùng không tồn tại" });
      }

      res.status(200).json({ message: "Người dùng đã được xóa" });
    } catch (error) {
      console.error("Error in deleteUser:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },

  // Lấy thông tin người dùng hiện tại (admin và employee)
  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(404).json({ error: "Người dùng không tồn tại" });
      }

      res.status(200).json(user);
    } catch (error) {
      console.error("Error in getCurrentUser:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },

  // Thay đổi mật khẩu (admin và employee)
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id).select("+password");

      // Kiểm tra mật khẩu hiện tại
      const validPassword = await user.comparePassword(currentPassword);
      if (!validPassword) {
        return res
          .status(400)
          .json({ error: "Mật khẩu hiện tại không chính xác" });
      }

      // Cập nhật mật khẩu mới
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.passwordChangedAt = Date.now();
      await user.save();

      res.status(200).json({ message: "Mật khẩu đã được thay đổi thành công" });
    } catch (error) {
      console.error("Error in changePassword:", error);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  },
};

module.exports = userController;
