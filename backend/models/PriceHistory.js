const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },
        unitName: {
            type: String,
            required: true,
        },
        oldPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        newPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        priceChange: {
            type: Number,
            required: true,
        },
        changePercentage: {
            type: Number,
            required: true,
        },
        changeType: {
            type: String,
            enum: ["increase", "decrease", "no_change"],
            required: true,
        },
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reason: {
            type: String,
            maxlength: 500,
            default: "",
        },
        changeDate: {
            type: Date,
            default: Date.now,
            required: true,
        },
        batchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Batch",
            required: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes
priceHistorySchema.index({ productId: 1, changeDate: -1 });
priceHistorySchema.index({ changedBy: 1 });
priceHistorySchema.index({ changeDate: -1 });
priceHistorySchema.index({ changeType: 1 });

// Virtual để tính toán thông tin thêm
priceHistorySchema.virtual("formattedPriceChange").get(function () {
    const sign = this.priceChange >= 0 ? "+" : "";
    return `${sign}${this.priceChange.toLocaleString("vi-VN")} VNĐ`;
});

priceHistorySchema.virtual("formattedChangePercentage").get(function () {
    const sign = this.changePercentage >= 0 ? "+" : "";
    return `${sign}${this.changePercentage.toFixed(2)}%`;
});

// Static method để tạo lịch sử thay đổi giá
priceHistorySchema.statics.createPriceHistory = async function (options) {
    const {
        productId,
        unitName,
        oldPrice,
        newPrice,
        changedBy,
        reason = "",
        batchId = null,
    } = options;

    if (oldPrice === newPrice) {
        return null; // Không tạo lịch sử nếu giá không thay đổi
    }

    const priceChange = newPrice - oldPrice;
    const changePercentage = oldPrice > 0 ? (priceChange / oldPrice) * 100 : 0;
    const changeType = priceChange > 0 ? "increase" : "decrease";

    const priceHistory = new this({
        productId,
        unitName,
        oldPrice,
        newPrice,
        priceChange,
        changePercentage,
        changeType,
        changedBy,
        reason,
        batchId,
    });

    return await priceHistory.save();
};

module.exports = mongoose.model("PriceHistory", priceHistorySchema);
