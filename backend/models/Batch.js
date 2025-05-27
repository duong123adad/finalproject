const mongoose = require("mongoose");
const { isValidObjectId } = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    batchCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    manufacture_day: {
      type: Date,
      required: true,
      validate: {
        validator: (value) => value <= new Date(),
        message: "Ngày sản xuất không thể trong tương lai",
      },
    },
    expiry_day: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.manufacture_day;
        },
        message: "Hạn sử dụng phải sau ngày sản xuất",
      },
    },
    initial_quantity: {
      type: Number,
      required: true,
      min: [1, "Số lượng ban đầu phải lớn hơn 0"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} phải là số nguyên",
      },
    },
    remaining_quantity: {
      type: Number,
      required: true,
      min: [0, "Số lượng còn lại không được âm"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} phải là số nguyên",
      },
    },
    sold_quantity: {
      type: Number,
      default: 0,
      min: [0, "Số lượng đã bán không được âm"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} phải là số nguyên",
      },
    },
    lost_quantity: {
      type: Number,
      default: 0,
      min: [0, "Số lượng bị mất không được âm"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} phải là số nguyên",
      },
    },
    quantity_on_shelf: {
      type: Number,
      default: 0,
      min: [0, "Số lượng trên kệ không được âm"],
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} phải là số nguyên",
      },
    },
    reserved_quantity: { // Thêm trường mới để track số lượng đã reserve
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} phải là số nguyên"
      }
    },
    status: {
      type: String,
      enum: ["hoạt động", "không hoạt động", "hết hạn", "hết hàng"],
      default: "hoạt động",
      required: true,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      validate: {
        validator: (value) => isValidObjectId(value),
        message: "ID nhà cung cấp không hợp lệ",
      },
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
      validate: {
        validator: (value) => isValidObjectId(value),
        message: "ID sản phẩm không hợp lệ",
      },
    },
    goodReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoodReceipt",
      required: true,
    },
    discountInfo: {
      isDiscounted: { type: Boolean, default: false },
      discountType: {
        type: String,
        enum: ["percentage", "fixed_amount"],
        default: "percentage",
      },
      discountValue: {
        type: Number,
        min: 0,
        validate: {
          validator: function (value) {
            if (this.discountInfo?.discountType === "percentage") {
              return value <= 100;
            }
            return true;
          },
          message: "Giảm giá phần trăm không vượt quá 100%",
        },
        default: 0,
      },
      discountStartDate: Date,
      discountEndDate: Date,
      discountReason: {
        type: String,
        enum: ["near_expiry", "promotion", "other"],
        default: "near_expiry",
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual tính số ngày còn lại đến hết hạn
batchSchema.virtual("daysUntilExpiry").get(function () {
  const diffTime = Math.abs(this.expiry_day - new Date());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Hook tự động trước khi lưu
batchSchema.pre("save", async function (next) {
  try {
    if (!this.batchCode) await generateBatchCode(this);
    await applyAutoDiscount(this);
    updateQuantities(this);
    updateStatus(this);
    next();
  } catch (error) {
    next(error);
  }
});

// Phương thức instance để tăng số lượng đã giữ
batchSchema.methods.increaseReservedQuantity = async function (quantity) {
  this.reserved_quantity += quantity;
  this.remaining_quantity -= quantity;
  if (this.remaining_quantity < 0) {
    throw new Error("Không đủ số lượng tồn kho để giữ hàng");
  }
  await this.save({ validateBeforeSave: false }); // Tránh gọi lại middleware 'save'
};

// Phương thức instance để giảm số lượng đã giữ
batchSchema.methods.decreaseReservedQuantity = async function (quantity) {
  this.reserved_quantity = Math.max(0, this.reserved_quantity - quantity);
  this.remaining_quantity += quantity;
  await this.save({ validateBeforeSave: false });
};

// Phương thức tính giá đã giảm
batchSchema.methods.getDiscountedPrice = async function () {
  const product = await mongoose
    .model("Product")
    .findById(this.product)
    .select("units")
    .lean();

  const baseUnit = product.units.find((u) => u.ratio === 1);
  if (!baseUnit) throw new Error("Không tìm thấy đơn vị cơ sở");

  let price = baseUnit.salePrice;

  if (this.discountInfo?.isDiscounted) {
    if (this.discountInfo.discountType === "percentage") {
      price *= 1 - this.discountInfo.discountValue / 100;
    } else {
      price = Math.max(0, price - this.discountInfo.discountValue);
    }
  }

  return parseFloat(price.toFixed(2));
};

// Helper functions
const generateBatchCode = async (batch) => {
  const product = await mongoose
    .model("Product")
    .findById(batch.product)
    .select("code name")
    .lean();

  const datePart = batch.createdAt.toISOString().slice(2, 10).replace(/-/g, "");
  const count = await mongoose.model("Batch").countDocuments({
    product: batch.product,
    createdAt: {
      $gte: new Date().setHours(0, 0, 0, 0),
      $lte: new Date().setHours(23, 59, 59, 999),
    },
  });

  batch.batchCode = `${product.code || product.name.slice(0, 3)}-${datePart}-${(
    count + 1
  )
    .toString()
    .padStart(3, "0")}`;
};

const applyAutoDiscount = (batch) => {
  if (batch.discountInfo.discountReason !== "near_expiry") return;

  const daysLeft = batch.daysUntilExpiry;
  if (daysLeft <= 7) {
    batch.discountInfo = {
      isDiscounted: true,
      discountType: "percentage",
      discountValue: 30,
      discountStartDate: new Date(),
      discountEndDate: batch.expiry_day,
      discountReason: "near_expiry",
    };
  } else if (daysLeft <= 14) {
    batch.discountInfo = {
      isDiscounted: true,
      discountType: "percentage",
      discountValue: 15,
      discountStartDate: new Date(),
      discountEndDate: batch.expiry_day,
      discountReason: "near_expiry",
    };
  }
};

const updateQuantities = (batch) => {
  batch.remaining_quantity =
    batch.initial_quantity -
    batch.sold_quantity -
    batch.lost_quantity -
    batch.quantity_on_shelf -
    batch.reserved_quantity; // Đã thêm reserved_quantity vào phép tính

  if (batch.remaining_quantity < 0) {
    throw new Error("Số lượng tồn không hợp lệ");
  }
};

const updateStatus = (batch) => {
  if (batch.expiry_day < new Date()) {
    batch.status = "hết hạn";
  } else if (batch.remaining_quantity + batch.quantity_on_shelf <= 0) {
    // Kiểm tra tổng số lượng khả dụng (kho + quầy)
    batch.status = "hết hàng";
  } else {
    batch.status = "hoạt động";
  }
};

// Indexes
batchSchema.index({ expiry_day: 1 });
batchSchema.index({ product: 1, status: 1 });
batchSchema.index({ "discountInfo.isDiscounted": 1 });

module.exports = mongoose.model("Batch", batchSchema);