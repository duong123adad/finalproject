// routes/goodReceipt.js
const express = require("express");
const router = express.Router();
const goodReceiptController = require("../controllers/goodReceiptController");
const { body } = require("express-validator");

const createGoodReceiptFromPOValidation = [
  body("purchaseOrderId")
    .isMongoId()
    .withMessage("ID phiếu đặt hàng không hợp lệ."),
  body("receivedBy").notEmpty().withMessage("Người nhận không được để trống."),
  body("items")
    .isArray({ min: 1 })
    .withMessage("Phải có ít nhất một sản phẩm trong phiếu nhập."),
  body("items.*.productId")
    .optional()
    .isMongoId()
    .withMessage("ID sản phẩm không hợp lệ."),
  body("items.*.product")
    .optional()
    .isMongoId()
    .withMessage("ID sản phẩm không hợp lệ."),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Số lượng phải lớn hơn 0."),
  body("items.*.manufactureDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Ngày sản xuất không hợp lệ."),
  body("items.*.manufacture_day")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Ngày sản xuất không hợp lệ."),
  body("items.*.expiryDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Ngày hết hạn không hợp lệ."),
  body("items.*.expiry_day")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Ngày hết hạn không hợp lệ."),
  body("notes").optional().isString().withMessage("Ghi chú phải là chuỗi."),
];

const updateGoodReceiptValidation = [
  body("purchaseOrder")
    .optional()
    .isMongoId()
    .withMessage("ID phiếu đặt hàng không hợp lệ."),
  body("supplier")
    .optional()
    .isMongoId()
    .withMessage("ID nhà cung cấp không hợp lệ."),
  body("receivedBy")
    .optional()
    .notEmpty()
    .withMessage("Người nhận không được để trống."),
  body("items")
    .optional()
    .isArray({ min: 1 })
    .withMessage("Phải có ít nhất một sản phẩm trong phiếu nhập."),
  body("items.*.productId")
    .optional()
    .isMongoId()
    .withMessage("ID sản phẩm không hợp lệ."),
  body("items.*.product")
    .optional()
    .isMongoId()
    .withMessage("ID sản phẩm không hợp lệ."),
  body("items.*.quantity")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Số lượng phải lớn hơn 0."),
  body("items.*.manufactureDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Ngày sản xuất không hợp lệ."),
  body("items.*.manufacture_day")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Ngày sản xuất không hợp lệ."),
  body("items.*.expiryDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Ngày hết hạn không hợp lệ."),
  body("items.*.expiry_day")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Ngày hết hạn không hợp lệ."),
  body("notes").optional().isString().withMessage("Ghi chú phải là chuỗi."),
  body("status")
    .optional()
    .isIn(["pending", "received", "completed", "cancelled"])
    .withMessage("Trạng thái không hợp lệ."),
];

router.post(
  "/from-po",
  createGoodReceiptFromPOValidation,
  goodReceiptController.createGoodReceiptFromPurchaseOrder
);
router.get("/", goodReceiptController.getAllGoodReceipts);
router.get("/:id", goodReceiptController.getGoodReceiptById);
router.put(
  "/:id",
  updateGoodReceiptValidation,
  goodReceiptController.updateGoodReceipt
);
router.patch("/confirm/:id", goodReceiptController.confirmGoodReceipt);

module.exports = router;
