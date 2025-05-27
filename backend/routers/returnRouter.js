const express = require("express");
const router = express.Router();
const returnController = require("../controllers/returnController");
const { body } = require("express-validator");
const authMiddleware = require("../middlewares/authMiddleware");

// Validation middleware
const createReturnValidation = [
    body("batchId")
        .isMongoId()
        .withMessage("ID lô hàng không hợp lệ"),
    body("supplierId")
        .isMongoId()
        .withMessage("ID nhà cung cấp không hợp lệ"),
    body("productId")
        .isMongoId()
        .withMessage("ID sản phẩm không hợp lệ"),
    body("quantity")
        .isInt({ min: 1 })
        .withMessage("Số lượng phải lớn hơn 0"),
    body("reason")
        .notEmpty()
        .withMessage("Lý do trả hàng là bắt buộc"),
    body("returnDate")
        .optional()
        .isISO8601()
        .withMessage("Ngày trả hàng không hợp lệ"),
];

// Routes
router.post("/", createReturnValidation, returnController.createReturn);

router.get("/", returnController.getAllReturns);

router.get("/statistics", returnController.getReturnStatistics);

router.get("/:id", returnController.getReturnById);

router.patch(
    "/:id/status",
    [
        body("status")
            .isIn(["pending", "completed", "cancelled"])
            .withMessage("Trạng thái không hợp lệ"),
    ],
    returnController.updateReturnStatus
);

router.post("/:id/resend-email", returnController.resendReturnEmail);

module.exports = router;
