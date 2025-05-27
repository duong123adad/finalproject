const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Vui lòng đăng nhập" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(401).json({ message: "Người dùng không tồn tại" });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Phiên đăng nhập không hợp lệ" });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Không có quyền thực hiện thao tác này" });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
