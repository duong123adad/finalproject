const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect, restrictTo } = require("../middlewares/authmiddleware");

// Apply protect middleware to all routes in this router
router.use(protect);

// Route để tạo đơn hàng (xử lý cả 'instore' và 'preorder')
router.post("/", orderController.createOrder);

// Route để lấy tất cả đơn hàng (có hỗ trợ tìm kiếm và lọc theo ngày) - MUST come before /:orderId
router.get("/", orderController.getAllOrders);

// Route để lấy thông tin một đơn hàng theo ID
router.get("/:orderId", orderController.getOrderById);

// Route để cập nhật thông tin phiếu đặt trước
router.patch("/:orderId", orderController.updatePreorder);

router.post("/cancel-batch", orderController.cancelBatch);
// Route để hoàn thành thanh toán phiếu đặt trước
router.post(
  "/:orderId/complete-payment",
  orderController.completePreorderPayment
);

module.exports = router;
