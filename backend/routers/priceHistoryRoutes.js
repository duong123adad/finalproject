const express = require("express");
const router = express.Router();
const priceHistoryController = require("../controllers/priceHistoryController");
// const { authenticate, authorize } = require("../middleware/auth");

// Routes cho lịch sử thay đổi giá
router.get("/", priceHistoryController.getAllPriceHistory);
router.get("/statistics", priceHistoryController.getPriceChangeStatistics);
router.get("/product/:productId", priceHistoryController.getPriceHistoryByProduct);
router.delete("/:id", priceHistoryController.deletePriceHistory);

module.exports = router;
