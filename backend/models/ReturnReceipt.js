const mongoose = require("mongoose");

const returnReceiptSchema = new mongoose.Schema({
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Supplier",
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    reason: {
        type: String,
        required: true,
        trim: true
    },
    returnDate: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ["return", "exchange"],
        required: true,
        default: "return"
    },
    status: {
        type: String,
        enum: ["pending", "completed", "cancelled"],
        default: "pending"
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    notes: {
        type: String,
        trim: true
    },
    returnNumber: {
        type: String,
        unique: true
    },
    productName: {
        type: String,
    },
}, { timestamps: true });

// Add pre-save hook to generate return numbers based on type
returnReceiptSchema.pre('save', function (next) {
    if (!this.returnNumber) {
        const timestamp = Date.now().toString().slice(-8);
        const prefix = this.type === "exchange" ? "EXC-" : "RET-";
        this.returnNumber = prefix + timestamp;
    }
    next();
});

// Indexes for better query performance
returnReceiptSchema.index({ supplierId: 1 });
returnReceiptSchema.index({ batchId: 1 });
returnReceiptSchema.index({ productId: 1 });
returnReceiptSchema.index({ returnDate: -1 });
returnReceiptSchema.index({ status: 1 });
returnReceiptSchema.index({ returnNumber: 1 });
returnReceiptSchema.index({ type: 1 });

module.exports = mongoose.model("ReturnReceipt", returnReceiptSchema);
