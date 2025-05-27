const Product = require("../models/Product");
const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const Batch = require("../models/Batch");
const PriceHistory = require("../models/PriceHistory");
const { isValidObjectId } = require("mongoose");

// Helper function to parse JSON fields
const parseJsonField = (field) => {
  if (!field) return undefined;
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch (error) {
      throw new Error(`Invalid JSON format in ${field}`);
    }
  }
  return field;
};

exports.createProduct = async (req, res) => {
  try {
    // Parse all JSON string fields
    let expiryDiscountRules = parseJsonField(req.body.expiryDiscountRules);
    let suppliers = parseJsonField(req.body.suppliers);
    let discount = parseJsonField(req.body.discount);

    // Extract other fields
    const {
      name,
      category,
      description,
      units,
      minStockLevel,
      reorderLevel,
      weight,
      dimensions,
      taxRate,
      tags,
    } = req.body;

    // Validate required fields
    const requiredFields = { name, category, units };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({
          success: false,
          message: `${field} is a required field.`,
        });
      }
    }

    if (!isValidObjectId(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format.",
      });
    }

    // Check if category exists
    const categoryExists = await Category.exists({ _id: category });
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    let supplierInfo = [];
    if (suppliers && Array.isArray(suppliers)) {
      for (const [index, supplier] of suppliers.entries()) {
        if (!supplier || typeof supplier !== "object") {
          return res.status(400).json({
            success: false,
            message: `Invalid supplier format at position ${index + 1}`,
            invalidEntry: supplier,
          });
        }

        if (!supplier.supplier) {
          return res.status(400).json({
            success: false,
            message: `Supplier ID is required at position ${index + 1}`,
            invalidEntry: supplier,
          });
        }

        if (!isValidObjectId(supplier.supplier)) {
          return res.status(400).json({
            success: false,
            message: `Invalid supplier ID format at position ${index + 1}`,
            invalidEntry: supplier,
          });
        }

        const supplierExists = await Supplier.exists({
          _id: supplier.supplier,
        });
        if (!supplierExists) {
          return res.status(404).json({
            success: false,
            message: `Supplier not found: ${supplier.supplier}`,
            invalidEntry: supplier,
          });
        }

        supplierInfo.push({
          supplier: supplier.supplier,
          isPrimary: Boolean(supplier.isPrimary),
        });
      }
    }

    // Validate expiryDiscountRules
    if (expiryDiscountRules && !Array.isArray(expiryDiscountRules)) {
      return res.status(400).json({
        success: false,
        message: "expiryDiscountRules must be an array",
      });
    }

    // --- Thêm xử lý cho expiryThresholdDays và lowQuantityThreshold ---
    let expiryThresholdDaysValue = undefined;
    if (
      expiryThresholdDays !== undefined &&
      expiryThresholdDays !== "" &&
      !isNaN(Number(expiryThresholdDays)) &&
      Number(expiryThresholdDays) >= 0
    ) {
      expiryThresholdDaysValue = parseInt(expiryThresholdDays, 10);
    }

    let lowQuantityThresholdValue = undefined;
    if (
      lowQuantityThreshold !== undefined &&
      lowQuantityThreshold !== "" &&
      !isNaN(Number(lowQuantityThreshold)) &&
      Number(lowQuantityThreshold) >= 0
    ) {
      lowQuantityThresholdValue = parseInt(lowQuantityThreshold, 10);
    }
    // --- hết thêm ---

    // Create new product
    const newProduct = new Product({
      name,
      category,
      description,
      units,
      minStockLevel,
      reorderLevel,
      weight,
      dimensions,
      taxRate,
      tags,
      expiryDiscountRules,
      discount,
      suppliers: supplierInfo,
      images: req.files?.map((file) => file.path) || [],
    });

    await newProduct.save();

    // Update suppliers with this product reference
    if (supplierInfo.length > 0) {
      await Supplier.updateMany(
        { _id: { $in: supplierInfo.map((s) => s.supplier) } },
        { $addToSet: { products: newProduct._id } }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      data: newProduct,
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.name === "ValidationError") {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate key error",
        field: Object.keys(error.keyPattern)[0],
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    // const queryObj = { ...req.query, active: true };
    const queryObj = { ...req.query };

    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = Product.find(JSON.parse(queryStr))
      .populate({
        path: "category",
        select: "name description",
      })
      .populate({
        path: "suppliers.supplier",
        select: "name company contact.phone contact.email",
      });

    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }

    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 200;
    const skip = (page - 1) * limit;

    // Đếm tổng số sản phẩm phù hợp (không phân trang)
    const count = await Product.countDocuments(JSON.parse(queryStr));

    query = query.skip(skip).limit(limit);

    const products = await query;

    return res.status(200).json({
      success: true,
      results: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get all products error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ.", // Internal server error
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    const products = await Product.find()
      .populate({
        path: "category",
        select: "name description",
      })
      .populate({
        path: "suppliers.supplier",
        select: "name company contact.phone contact.email",
      })
      .populate({
        path: "batches",
        select: "manufacture_day expiry_day remaining_quantity status",
      });

    return res.status(200).json({
      success: true,
      results: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get all products error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ.", // Internal server error
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID sản phẩm không hợp lệ.", // Invalid product ID
      });
    }

    const product = await Product.findById(id)
      .populate({
        path: "category",
        select: "name description parentCategory",
      })
      .populate({
        path: "suppliers.supplier",
        select: "name company contact.phone contact.email paymentTerms",
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.", // Product not found
      });
    }

    // Fetch batches separately since they're not in the Product schema
    const batches = await Batch.find({
      product: id,
      status: "active",
    }).select(
      "manufacture_day expiry_day remaining_quantity status import_price discountInfo"
    );

    return res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        batches,
      },
    });
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ.", // Internal server error
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Store original units for price history comparison
    const originalUnits = JSON.parse(JSON.stringify(product.units));

    // Parse JSON fields
    if (typeof updates.expiryDiscountRules === "string") {
      updates.expiryDiscountRules = parseJsonField(updates.expiryDiscountRules);
    }
    if (typeof updates.suppliers === "string") {
      updates.suppliers = parseJsonField(updates.suppliers);
    }
    if (typeof updates.discount === "string") {
      updates.discount = parseJsonField(updates.discount);
    }

    // Handle category update
    if (updates.category) {
      if (!isValidObjectId(updates.category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID.",
        });
      }

      const categoryExists = await Category.findById(updates.category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Category not found.",
        });
      }
    }

    // Handle suppliers update
    if (updates.suppliers !== undefined) {
      if (!Array.isArray(updates.suppliers)) {
        return res.status(400).json({
          success: false,
          message: "Suppliers must be an array",
        });
      }

      const oldSupplierIds = product.suppliers.map((s) =>
        s.supplier.toString()
      );
      const newSupplierIds = [];
      const validSuppliers = [];

      for (const [index, supplier] of updates.suppliers.entries()) {
        if (!supplier || typeof supplier !== "object") {
          return res.status(400).json({
            success: false,
            message: `Invalid supplier format at position ${index + 1}`,
            invalidEntry: supplier,
          });
        }

        if (!supplier.supplier) {
          return res.status(400).json({
            success: false,
            message: `Supplier ID is required at position ${index + 1}`,
            invalidEntry: supplier,
          });
        }

        if (!isValidObjectId(supplier.supplier)) {
          return res.status(400).json({
            success: false,
            message: `Invalid supplier ID format at position ${index + 1}`,
            invalidEntry: supplier,
          });
        }

        const supplierExists = await Supplier.findById(supplier.supplier);
        if (!supplierExists) {
          return res.status(404).json({
            success: false,
            message: `Supplier not found: ${supplier.supplier}`,
            invalidEntry: supplier,
          });
        }

        validSuppliers.push({
          supplier: supplier.supplier,
          isPrimary: Boolean(supplier.isPrimary),
        });

        newSupplierIds.push(supplier.supplier.toString());
      }

      // Determine suppliers to add/remove
      const suppliersToAdd = newSupplierIds.filter(
        (id) => !oldSupplierIds.includes(id)
      );
      const suppliersToRemove = oldSupplierIds.filter(
        (id) => !newSupplierIds.includes(id)
      );

      // Update product's suppliers
      product.suppliers = validSuppliers;

      // Update supplier references
      if (suppliersToAdd.length > 0) {
        await Supplier.updateMany(
          { _id: { $in: suppliersToAdd } },
          { $addToSet: { products: id } }
        );
      }

      if (suppliersToRemove.length > 0) {
        await Supplier.updateMany(
          { _id: { $in: suppliersToRemove } },
          { $pull: { products: id } }
        );
      }
    }

    // Handle price changes in units and create price history
    if (updates.units && Array.isArray(updates.units)) {
      for (const newUnit of updates.units) {
        const originalUnit = originalUnits.find(u => u.name === newUnit.name);

        if (originalUnit && originalUnit.salePrice !== newUnit.salePrice) {
          // Create price history for sale price change
          await PriceHistory.createPriceHistory({
            productId: id,
            unitName: newUnit.name,
            oldPrice: originalUnit.salePrice,
            newPrice: newUnit.salePrice,
            changedBy: req.user._id,
            reason: req.body.priceChangeReason || "Cập nhật giá sản phẩm",
          });
        }
      }
    }

    // --- Chuẩn hóa cập nhật expiryThresholdDays và lowQuantityThreshold ---
    if (updates.expiryThresholdDays !== undefined) {
      if (
        updates.expiryThresholdDays === "" ||
        updates.expiryThresholdDays === null
      ) {
        product.expiryThresholdDays = undefined;
      } else {
        const value = Number(updates.expiryThresholdDays);
        if (!isNaN(value) && value >= 0) {
          product.expiryThresholdDays = value;
        }
      }
    }

    if (updates.lowQuantityThreshold !== undefined) {
      if (
        updates.lowQuantityThreshold === "" ||
        updates.lowQuantityThreshold === null
      ) {
        product.lowQuantityThreshold = undefined;
      } else {
        const value = Number(updates.lowQuantityThreshold);
        if (!isNaN(value) && value >= 0) {
          product.lowQuantityThreshold = value;
        }
      }
    }
    // --- hết chuẩn hóa ---

    // Handle images update
    if (req.files && req.files.length > 0) {
      product.images = [
        ...product.images,
        ...req.files.map((file) => file.path),
      ];
    }

    // Update other fields
    const allowedUpdates = [
      "name",
      "category",
      "description",
      "units",
      "minStockLevel",
      "reorderLevel",
      "weight",
      "dimensions",
      "taxRate",
      "tags",
      "expiryDiscountRules",
      "discount",
      "active",
    ];

    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        product[field] = updates[field];
      }
    });

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully.",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Add new endpoint to get price history
exports.getProductPriceHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, unitName } = req.query;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const query = { productId: id };
    if (unitName) {
      query.unitName = unitName;
    }

    const priceHistory = await PriceHistory.find(query)
      .populate('changedBy', 'fullName username')
      .populate('batchId', 'batchCode')
      .sort({ changeDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PriceHistory.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: priceHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get price history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // Remove product reference from suppliers
    await Supplier.updateMany({ products: id }, { $pull: { products: id } });

    return res.status(200).json({
      success: true,
      message: "Product deactivated successfully.",
      data: product,
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

exports.getProductBatches = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const query = { product: id };
    if (status) {
      query.status = status;
    }

    const batches = await Batch.find(query)
      .populate({
        path: "supplier",
        select: "name contact.phone",
      })
      .sort("-manufacture_day");

    return res.status(200).json({
      success: true,
      results: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error("Get product batches error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
exports.getByBatchCode = async (req, res) => {
  try {
    const { batchCode } = req.params; // Tìm lô hàng theo batchCode

    const batch = await Batch.findOne({ batchCode }).populate({
      path: "product",
      select: "name category units minStockLevel",
      populate: {
        path: "category",
        select: "name",
      },
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lô hàng",
      });
    } // Kiểm tra tồn kho và hạn sử dụng

    const isExpired = new Date() > batch.expiry_day;
    const stockStatus =
      batch.remaining_quantity <= 0
        ? "Hết hàng"
        : batch.remaining_quantity < 10
          ? "Sắp hết"
          : "Còn hàng";

    return res.status(200).json({
      success: true,
      data: {
        product: {
          id: batch.product._id,
          name: batch.product.name,
          category: batch.product.category,
          units: batch.product.units,
          minStock: batch.product.minStockLevel,
        },
        batch: {
          id: batch._id,
          code: batch.batchCode,
          manufactureDate: batch.manufacture_day,
          expiryDate: batch.expiry_day,
          remaining: batch.remaining_quantity,
          status: batch.status,
          stockStatus,
          isExpired,
          ...batch.toObject(), // Lấy tất cả các trường khác của batch
        },
      },
    });
  } catch (error) {
    console.error("Batch code scan error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: error.message,
    });
  }
};
exports.getProductsWithStockDetails = async (req, res) => {
  try {
    const productsWithStockDetails = await Product.aggregate([
      {
        $lookup: {
          from: "batches", // Tên của collection Batches
          localField: "_id",
          foreignField: "product",
          as: "batches",
        },
      },
      {
        $match: {
          "batches.remaining_quantity": { $gt: 0 },
          "batches.status": "active", // Chỉ lấy các batch còn hoạt động
          active: true, // Chỉ lấy các sản phẩm đang hoạt động
        },
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          category: { $first: "$category" },
          description: { $first: "$description" },
          units: { $first: "$units" },
          minStockLevel: { $first: "$minStockLevel" },
          reorderLevel: { $first: "$reorderLevel" },
          weight: { $first: "$weight" },
          dimensions: { $first: "$dimensions" },
          taxRate: { $first: "$taxRate" },
          tags: { $first: "$tags" },
          expiryDiscountRules: { $first: "$expiryDiscountRules" },
          discount: { $first: "$discount" },
          suppliers: { $first: "$suppliers" },
          images: { $first: "$images" },
          inStockBatches: {
            $push: {
              _id: "$batches._id",
              batchCode: "$batches.batchCode",
              manufacture_day: "$batches.manufacture_day",
              expiry_day: "$batches.expiry_day",
              remaining_quantity: "$batches.remaining_quantity",
              import_price: "$batches.import_price",
              discountInfo: "$batches.discountInfo",
              status: "$batches.status",
              supplier: "$batches.supplier",
              createdAt: "$batches.createdAt",
              updatedAt: "$batches.updatedAt",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          category: 1,
          description: 1,
          units: 1,
          minStockLevel: 1,
          reorderLevel: 1,
          weight: 1,
          dimensions: 1,
          taxRate: 1,
          tags: 1,
          expiryDiscountRules: 1,
          discount: 1,
          suppliers: 1,
          images: 1,
          inStockBatches: 1,
        },
      },
      {
        $lookup: {
          from: "categories", // Tên của collection Categories
          localField: "category",
          foreignField: "_id",
          as: "categoryInfo",
        },
      },
      {
        $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: "suppliers", // Tên của collection Suppliers
          localField: "inStockBatches.supplier",
          foreignField: "_id",
          as: "supplierInfo",
        },
      },
      // Gộp thông tin nhà cung cấp (nếu cần)
      {
        $addFields: {
          category: "$categoryInfo",
          // supplierDetails: "$supplierInfo" // Nếu muốn xem thông tin chi tiết nhà cung cấp cho từng batch
        },
      },
      {
        $project: {
          categoryInfo: 0,
          supplierInfo: 0,
          // Không cần loại bỏ các trường của batch nữa vì chúng ta muốn giữ lại
        },
      },
    ]);

    // Lọc ra các sản phẩm hết hàng (không có batch nào còn số lượng)
    const outOfStockProducts = await Product.find({
      _id: { $nin: productsWithStockDetails.map((p) => p._id) },
      active: true,
    }).populate({
      path: "category",
      select: "name description",
    });

    return res.status(200).json({
      success: true,
      inStockProducts: {
        results: productsWithStockDetails.length,
        data: productsWithStockDetails,
      },
      outOfStockProducts: {
        results: outOfStockProducts.length,
        data: outOfStockProducts,
      },
    });
  } catch (error) {
    console.error("Get products with stock details error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ.",
      error: error.message,
    });
  }
};
 exports.getProductsWithBatches = async (req, res) => {
  try {
    const query = {
      batches: { $exists: true, $not: { $size: 0 } }
    };
    if (req.query.category) {
      query.category = req.query.category;
    }

    const productsWithBatches = await Product.find(query)
      .populate({
        path: "category",
        select: "name description",
      })
      .populate({
        path: "suppliers.supplier",
        select: "name company contact.phone contact.email",
      })
      .populate({
        path: "batches",
        select: "",
      });

    return res.status(200).json({
      success: true,
      results: productsWithBatches.length,
      data: productsWithBatches,
    });
  } catch (error) {
    console.error("Get products with batches error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ nội bộ.",
      error: error.message,
    });
  }
};