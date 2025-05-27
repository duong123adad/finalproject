const express = require("express");
const router = express.Router();
const productController = require("../controllers/productControlller");
const upload = require("../middlewares/upload");
const { protect, restrictTo } = require("../middlewares/authMiddleware");

// Public routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.get("/batch/products-with-batches", productController.getProductsWithBatches); 
// Admin protected routes
router.use(protect, restrictTo("admin","employee"));
// Thêm route mới
router.post("/", upload.array("images", 5), productController.createProduct);
router.get("/all/products", productController.getAll);
router.patch(
  "/:id",
  upload.array("images", 5),
  productController.updateProduct
);
router.delete("/:id", productController.deleteProduct);
router.get("/:id/batches", productController.getProductBatches);
router.get("/batch/:batchCode", productController.getByBatchCode);
module.exports = router;
