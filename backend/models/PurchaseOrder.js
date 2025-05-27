const mongoose = require("mongoose");

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String }, // Store product name for historical reference
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    unit: {
      type: String,
      required: true,
      // enum: ["cái", "gói", "bao", "thùng", "chai", "lọ", "hộp", "kg", "gram", "liter", "ml"],
      default: "cái",
    },
    unitPrice: {
      type: Number,
      min: 0,
    },
    totalPrice: {
      type: Number,
      min: 0,
    },
    conversionRate: {
      type: Number,
      min: 1,
      default: 1,
      // Đại diện cho tỷ lệ chuyển đổi từ đơn vị cơ bản sang đơn vị đã chọn
      // Ví dụ: nếu đơn vị cơ bản là "cái" và đơn vị đã chọn là "thùng" với tỷ lệ 24,
      // thì conversionRate = 24
    },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    note: { type: String, default: "", maxlength: 200 },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, required: false },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdByName: { type: String },
    status: {
      type: String,
      enum: ["đã gửi NCC", "đã nhận 1 phần", "hoàn thành", "đã hủy"],
      default: "đã gửi NCC",
    },
    items: [purchaseOrderItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    orderDate: { type: Date, default: Date.now, required: false },
    expectedDeliveryDate: {
      type: Date,
      // validate: {
      //   validator: function (value) {
      //     if (!value || !this.orderDate) return true;
      //     return value.getTime() >= this.orderDate.getTime();
      //   },
      //   message: "Ngày giao hàng dự kiến phải bằng hoặc sau ngày đặt hàng",
      // },
    },
    notes: { type: String, maxlength: 500 },
    attachments: [{ type: String }],
    deliveryAddress: { type: String },
    paymentMethod: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

purchaseOrderSchema.index({ orderNumber: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);