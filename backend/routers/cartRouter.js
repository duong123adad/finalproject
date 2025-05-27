const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

// API cho giỏ hàng
// Tạo giỏ hàng (có thể không cần route riêng nếu addToCart xử lý cả việc tạo)
// router.post('/', cartController.createCart);

// Thêm sản phẩm vào giỏ hàng hoặc tăng số lượng nếu đã tồn tại
router.post("/add", cartController.addToCart);
router.post("/createorupdate", cartController.createOrUpdateCart);
// Lấy giỏ hàng
router.get("/", cartController.getCart);

// Cập nhật số lượng sản phẩm trong giỏ
router.put("/update/:productId", cartController.updateQuantity);

// Xóa một sản phẩm khỏi giỏ hàng
router.delete("/remove/:productId", cartController.removeFromCart);

// Xóa toàn bộ giỏ hàng
router.delete("/", cartController.clearCart);

module.exports = router;
