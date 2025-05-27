const mongoose = require("mongoose");

const batchUsedSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} không phải là số nguyên",
      },
    },
  },
  { _id: false }
);

const orderProductSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} không phải là số nguyên",
      },
    },
    selectedUnitName: { type: String, required: true },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "{VALUE} không phải số hợp lệ",
      },
    },
    originalUnitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "{VALUE} không phải số hợp lệ",
      },
    },
    batchesUsed: [batchUsedSchema],
    itemTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: "{VALUE} không phải số hợp lệ",
      },
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  products: [orderProductSchema],
  totalAmount: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isFinite,
      message: "{VALUE} không phải số hợp lệ",
    },
  },
  discountAmount: {
    type: Number,
    default: 0,
    validate: {
      validator: Number.isFinite,
      message: "{VALUE} không phải số hợp lệ",
    },
  },
  taxRate: { type: Number, default: 0, min: 0 },
  taxAmount: {
    type: Number,
    default: 0,
    validate: {
      validator: Number.isFinite,
      message: "{VALUE} không phải số hợp lệ",
    },
  },
  finalAmount: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isFinite,
      message: "{VALUE} không phải số hợp lệ",
    },
  },
  orderNumber: { type: String, unique: true },
  paymentMethod: {
    type: String,
    enum: ["cash", "transfer", "vnpay", "momo"],
    required: true,
    default: "cash",
  },
  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid", "pending", "failed"],
    default: "unpaid",
  },
  orderType: {
    type: String,
    enum: ["instore", "preorder"],
    default: "instore",
    required: true,
  },
  expirationDate: {
    type: Date,
    required: function () {
      return this.orderType === "preorder";
    },
  },
  depositAmount: { type: Number, default: 0, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  notes: { type: String, trim: true, maxlength: 500 },
  transactionId: {
    type: String,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.index({ customerId: 1 });
orderSchema.index({ date: -1 });
orderSchema.index({ paymentStatus: 1 });


module.exports = mongoose.model("Order", orderSchema);
