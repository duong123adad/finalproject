// backend/controllers/goodReceiptController.js
const mongoose = require("mongoose");
const GoodReceipt = require("../models/Goodreceipt");
const Batch = require("../models/Batch");
const Product = require("../models/Product");
const PurchaseOrder = require("../models/PurchaseOrder");
const Supplier = require("../models/Supplier");
const { v4: uuidv4 } = require("uuid");

const goodReceiptController = {
  createGoodReceiptFromPurchaseOrder: async (req, res) => {
    try {
      const { purchaseOrderId, receivedBy, items, notes } = req.body;
      console.log("Dữ liệu nhận được khi tạo phiếu nhập:", req.body); // Log dữ liệu request body

      if (!purchaseOrderId) {
        return res.status(400).json({ message: "Thiếu ID phiếu đặt hàng" });
      }
      const order = await PurchaseOrder.findById(purchaseOrderId);
      if (!order) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy phiếu đặt hàng" });
      }

      // Transform items and calculate totalAmount as sum of all item totalPrices
      const mappedItems = items.map((item) => ({
        product: item.productId || item.product,
        quantity: item.quantity,
        manufactureDate: item.manufactureDate || item.manufacture_day,
        expiryDate: item.expiryDate || item.expiry_day,
        unit: item.unit,
        quantity_unit: item.quantity_unit, // quantity_unit là số lượng nhập theo đơn vị (unit) được chọn
        price: item.unitPrice || item.price, // Add price field
        totalPrice: item.totalPrice
      }));

      // Calculate totalAmount as the sum of all item totalPrices
      const totalAmount = mappedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

      const goodReceipt = new GoodReceipt({
        purchaseOrder: purchaseOrderId,
        supplier: order.supplier,
        receivedBy,
        items: mappedItems,
        notes,
        totalAmount // Use the calculated totalAmount
      });

      const savedGoodReceipt = await goodReceipt.save();
      await PurchaseOrder.findByIdAndUpdate(
        purchaseOrderId,
        { status: "completed" },
        { new: true }
      );
      console.log("Phiếu nhập kho đã được tạo:", savedGoodReceipt); // Log phiếu nhập đã tạo
      res.status(201).json(savedGoodReceipt);
    } catch (error) {
      console.error("Lỗi khi tạo phiếu nhập kho:", error); // Sử dụng console.error cho lỗi
      res.status(500).json({ error: error.message });
    }
  },
  getAllGoodReceipts: async (req, res) => {
    try {
      // Extract filter parameters from request query
      const { supplier, status, search, startDate, endDate } = req.query;

      // Build filter object
      const filter = {};

      // Add supplier filter if provided
      if (supplier) {
        filter.supplier = mongoose.Types.ObjectId.isValid(supplier) ? supplier : null;
      }

      // Add status filter if provided and not 'all'
      if (status && status !== 'all') {
        filter.status = status;
      }

      // Add date range filters if provided
      if (startDate || endDate) {
        filter.receiptDate = {};
        if (startDate) {
          filter.receiptDate.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.receiptDate.$lte = new Date(endDate);
        }
      }

      // Add search functionality if provided (can search by ID or related fields)
      if (search) {
        // We'll need to fetch supplier IDs that match the search term first
        const matchingSuppliers = await Supplier.find({
          name: { $regex: search, $options: 'i' }
        }).select('_id');

        const supplierIds = matchingSuppliers.map(s => s._id);

        // Create the search filter with $or to match multiple fields
        const searchFilter = {
          $or: [
            { _id: mongoose.Types.ObjectId.isValid(search) ? search : null },
            { supplier: { $in: supplierIds } },
            { notes: { $regex: search, $options: 'i' } }
          ]
        };

        // Combine with existing filters
        Object.assign(filter, searchFilter);
      }

      console.log("Filter applied:", filter);

      const receipts = await GoodReceipt.find(filter)
        .populate("supplier")
        .populate({
          path: "items.product",
          strictPopulate: false,
        })
        .sort({ receiptDate: -1 });

      console.log("Tìm thấy", receipts.length, "phiếu nhập kho");
      res.status(200).json(receipts);
    } catch (error) {
      console.error("Lỗi khi lấy tất cả phiếu nhập kho:", error);
      res.status(500).json({ error: error.message });
    }
  },
  getGoodReceiptById: async (req, res) => {
    try {
      const receipt = await GoodReceipt.findById(req.params.id)
        .populate("supplier")
        .populate({
          path: "items.product",
          strictPopulate: false,
        });
      if (!receipt) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy phiếu nhập kho." });
      }
      console.log("Chi tiết phiếu nhập kho ID:", req.params.id, receipt); // Log chi tiết phiếu nhập kho
      res.status(200).json(receipt);
    } catch (error) {
      console.error("Lỗi khi lấy phiếu nhập kho theo ID:", error);
      res.status(500).json({ error: error.message });
    }
  },
  confirmGoodReceipt: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const receiptId = req.params.id;
      const receipt = await GoodReceipt.findById(receiptId)
        .session(session)
        .select("status items supplier")
        .lean();

      if (!receipt) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Phiếu nhập không tồn tại" });
      }

      if (receipt.status === "received") {
        await session.abortTransaction();
        return res.status(400).json({ message: "Phiếu đã được xác nhận" });
      }

      const batchCreationPromises = receipt.items.map(async (item) => {
        const batch = new Batch({
          batchCode: `BATCH-${uuidv4()}`,
          product: item.product,
          supplier: receipt.supplier,
          manufacture_day: item.manufactureDate,
          expiry_day: item.expiryDate,
          initial_quantity: item.quantity,
          remaining_quantity: item.quantity,
          unit: item.unit,
          quantity_unit: item.quantity_unit,
          import_price: item.price, // Add price to batch
          status: "hoạt động",
          goodReceipt: receiptId,
        });

        const savedBatch = await batch.save({ session });
        await Product.updateOne(
          { _id: item.product },
          { $addToSet: { batches: savedBatch._id } },
          { session }
        );
        return savedBatch;
      });

      const batches = await Promise.all(batchCreationPromises);
      await GoodReceipt.updateOne(
        { _id: receiptId },
        { $set: { status: "received" } },
        { session }
      );

      await session.commitTransaction();
      res.json({ batches });
    } catch (error) {
      await session.abortTransaction();
      res.status(500).json({ error: error.message });
    } finally {
      session.endSession();
    }
  },
  updateGoodReceipt: async (req, res) => {
    try {
      const receipt = await GoodReceipt.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      )
        .populate("supplier")
        .populate({
          path: "items.product",
          strictPopulate: false,
        });
      if (!receipt) {
        return res
          .status(404)
          .json({ message: "Không tìm thấy phiếu nhập kho." });
      }
      console.log("Phiếu nhập kho đã được cập nhật:", receipt); // Log phiếu nhập sau khi cập nhật
      res.status(200).json(receipt);
    } catch (error) {
      console.error("Lỗi khi cập nhật phiếu nhập kho:", error);
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = goodReceiptController;
