const Batch = require("../models/Batch");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const PriceHistory = require("../models/PriceHistory");
const mongoose = require("mongoose");

// Helper function để cập nhật trạng thái batch
const updateBatchStatus = (batch) => {
  const now = new Date();
  const totalAvailable = batch.remaining_quantity + batch.quantity_on_shelf;

  if (batch.expiry_day < now) {
    batch.status = "hết hạn";
  } else if (totalAvailable <= 0) {
    batch.status = "hết hàng";
  } else {
    batch.status = "hoạt động";
  }

  return batch;
};

exports.createBatch = async (req, res) => {
  try {
    const {
      manufacture_day,
      expiry_day,
      quantity,
      status,
      supplierName,
      productName,
      initial_quantity, // Thêm trường initial_quantity nếu có
      remaining_quantity, // Thêm trường remaining_quantity nếu có
      sold_quantity, // Thêm trường sold_quantity nếu có
      lost_quantity, // Thêm trường lost_quantity nếu có
      quantity_on_shelf, // Thêm trường quantity_on_shelf nếu có
      reserved_quantity,
      discountInfo, // Thêm trường discountInfo nếu có
      goodReceipt, // Thêm trường goodReceipt nếu có
    } = req.body;

    const supplier = await Supplier.findOne({ name: supplierName });
    if (!supplier) {
      return res.status(400).json({ message: "Nhà cung cấp không tồn tại" });
    }

    const product = await Product.findOne({ name: productName });
    if (!product) {
      return res.status(400).json({ message: "Sản phẩm không tồn tại" });
    }

    if (new Date(manufacture_day) >= new Date(expiry_day)) {
      return res
        .status(400)
        .json({ message: "Ngày sản xuất phải trước ngày hết hạn" });
    }

    if (quantity <= 0 && initial_quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
    }

    const newBatch = new Batch({
      manufacture_day,
      expiry_day,
      initial_quantity: initial_quantity || quantity, // Ưu tiên initial_quantity nếu có, không thì dùng quantity
      remaining_quantity: remaining_quantity || initial_quantity || quantity, // Tương tự
      sold_quantity: sold_quantity || 0,
      lost_quantity: lost_quantity || 0,
      quantity_on_shelf: quantity_on_shelf || 0,
      reserved_quantity: reserved_quantity || 0,
      status,
      supplier: supplier._id,
      product: product._id,
      discountInfo,
      goodReceipt,
    });

    await newBatch.save();
    product.batches.push(newBatch._id);
    await product.save();
    res.status(201).json(newBatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getAllBatches = async (req, res) => {
  try {
    const { search, status } = req.query;
    const query = {};
    const orConditions = [];

    if (status) {
      query.status = status;
    }

    if (search) {
      const isObjectId = mongoose.Types.ObjectId.isValid(search);

      // Tìm kiếm theo ID lô hàng
      if (isObjectId) {
        orConditions.push({ _id: search });
      }

      // Tìm kiếm theo thông tin sản phẩm
      const products = await Product.find({
        $or: [{ name: { $regex: search, $options: "i" } }],
      }).select("_id");

      if (products.length > 0) {
        orConditions.push({ product: { $in: products.map((p) => p._id) } });
      }

      // Nếu không có điều kiện nào khớp, trả về mảng rỗng
      if (orConditions.length === 0) {
        return res.status(200).json([]);
      }

      query.$or = orConditions;
    }

    const batches = await Batch.find(query)
      .populate("product", "name SKU description images")
      .populate("supplier", "name")
      .populate("goodReceipt", "receiptNumber");

    // Cập nhật trạng thái cho tất cả batches và lưu những thay đổi
    const updatedBatches = [];
    for (const batch of batches) {
      const originalStatus = batch.status;
      updateBatchStatus(batch);

      // Lưu nếu trạng thái thay đổi
      if (originalStatus !== batch.status) {
        await batch.save({ validateBeforeSave: false });
      }

      updatedBatches.push(batch);
    }

    res.status(200).json(updatedBatches);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách lô hàng:", error);
    res.status(500).json({ message: "Lỗi server khi tải dữ liệu lô hàng" });
  }
};
exports.updateBatch = async (req, res) => {
  try {
    const batchId = req.params.id;
    const updates = req.body;

    // Get original batch for comparison
    const originalBatch = await Batch.findById(batchId).populate('product');
    if (!originalBatch) {
      return res.status(404).json({ message: "Lô hàng không tồn tại" });
    }

    // Check for discount changes
    if (updates.discountInfo && originalBatch.discountInfo) {
      const oldDiscount = originalBatch.discountInfo;
      const newDiscount = updates.discountInfo;

      // If discount status or value changed, create price history
      if (
        oldDiscount.isDiscounted !== newDiscount.isDiscounted ||
        oldDiscount.discountValue !== newDiscount.discountValue ||
        oldDiscount.discountType !== newDiscount.discountType
      ) {
        const product = originalBatch.product;
        const baseUnit = product.units.find(u => u.ratio === 1);

        if (baseUnit) {
          const oldPrice = oldDiscount.isDiscounted
            ? (oldDiscount.discountType === 'percentage'
              ? baseUnit.salePrice * (1 - oldDiscount.discountValue / 100)
              : Math.max(0, baseUnit.salePrice - oldDiscount.discountValue))
            : baseUnit.salePrice;

          const newPrice = newDiscount.isDiscounted
            ? (newDiscount.discountType === 'percentage'
              ? baseUnit.salePrice * (1 - newDiscount.discountValue / 100)
              : Math.max(0, baseUnit.salePrice - newDiscount.discountValue))
            : baseUnit.salePrice;

          await PriceHistory.createPriceHistory({
            productId: product._id,
            unitName: baseUnit.name,
            oldPrice: oldPrice,
            newPrice: newPrice,
            changedBy: req.user._id,
            reason: `Thay đổi giảm giá lô hàng: ${newDiscount.discountReason || 'Không rõ lý do'}`,
            batchId: batchId,
          });
        }
      }
    }

    const updatedBatch = await Batch.findByIdAndUpdate(
      batchId,
      updates,
      { new: true }
    )
      .populate("product", "name SKU description createdAt updatedAt images ")
      .populate("supplier", "name")
      .populate("goodReceipt", "receiptNumber");

    res.status(200).json(updatedBatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const deletedBatch = await Batch.findByIdAndDelete(req.params.id);
    if (!deletedBatch)
      return res.status(404).json({ message: "Lô hàng không tồn tại" });
    res.status(200).json({ message: "Lô hàng đã được xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const batchId = req.params.id;

    const batch = await Batch.findById(batchId)
      .populate("product", "name SKU description createdAt updatedAt images ")
      .populate("supplier", "name")
      .populate("goodReceipt", "receiptNumber");

    if (!batch) {
      return res.status(404).json({ message: "Batch không tồn tại" });
    }

    // Cập nhật trạng thái batch
    const originalStatus = batch.status;
    updateBatchStatus(batch);

    // Lưu nếu trạng thái thay đổi
    if (originalStatus !== batch.status) {
      await batch.save({ validateBeforeSave: false });
    }

    res.status(200).json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.transferToShelf = async (req, res) => {
  try {
    const { quantity } = req.body;
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({ message: "Lô hàng không tồn tại" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
    }

    // Tính số lượng khả dụng (đã trừ lượng đặt trước)
    const availableQuantity = batch.remaining_quantity - batch.reserved_quantity;

    if (availableQuantity < quantity) {
      return res.status(400).json({
        message: `Số lượng khả dụng để chuyển là ${availableQuantity}. Không đủ ${quantity} yêu cầu.`,
      });
    }

    // Cập nhật số lượng
    batch.remaining_quantity -= quantity;
    batch.quantity_on_shelf += quantity;

    // Cập nhật trạng thái nếu hết hàng
    if (batch.remaining_quantity + batch.quantity_on_shelf <= 0) {
      batch.status = "hết hàng";
    }

    const updatedBatch = await batch.save({ validateModifiedOnly: true });
    res.status(200).json(updatedBatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.transferToWarehouse = async (req, res) => {
  try {
    const { quantity } = req.body;
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({ message: "Lô hàng không tồn tại" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
    }

    if (batch.quantity_on_shelf < quantity) {
      return res.status(400).json({
        message: "Số lượng trên quầy không đủ để chuyển",
      });
    }

    batch.remaining_quantity += quantity;
    batch.quantity_on_shelf -= quantity;

    // Cập nhật trạng thái về hoạt động nếu có hàng trở lại
    updateBatchStatus(batch);

    const updatedBatch = await batch.save({ validateModifiedOnly: true });
    res.status(200).json(updatedBatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getBatchesByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { status, showAvailable } = req.query;

    // Validate productId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "ID sản phẩm không hợp lệ" });
    }

    // Build query conditions
    const query = {
      product: productId,
      ...(status && { status }), // Filter by status if provided
      ...(showAvailable === "true" && { remaining_quantity: { $gt: 0 } }), // Filter available batches
    };

    const batches = await Batch.find(query)
      .populate("product") // Lấy đầy đủ thông tin của sản phẩm
      .populate("supplier", "name")
      .sort({ expiry_day: 1 }); // Sắp xếp theo ngày hết hạn tăng dần

    // Cập nhật trạng thái cho tất cả batches
    const updatedBatches = [];
    for (const batch of batches) {
      const originalStatus = batch.status;
      updateBatchStatus(batch);

      // Lưu nếu trạng thái thay đổi
      if (originalStatus !== batch.status) {
        await batch.save({ validateBeforeSave: false });
      }

      updatedBatches.push(batch);
    }

    res.status(200).json(updatedBatches);
  } catch (error) {
    console.error("Lỗi khi lấy lô hàng theo sản phẩm:", error);
    res.status(500).json({
      message: "Lỗi server khi tải dữ liệu lô hàng theo sản phẩm",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
