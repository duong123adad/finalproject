const PriceHistory = require("../models/PriceHistory");
const Product = require("../models/Product");
const { isValidObjectId } = require("mongoose");

const priceHistoryController = {
    // Lấy tất cả lịch sử thay đổi giá
    getAllPriceHistory: async (req, res) => {
        try {
            const {
                page = 1,
                limit = 20,
                productId,
                changeType,
                startDate,
                endDate,
                search,
            } = req.query;

            const query = {};

            // Filter by product
            if (productId && isValidObjectId(productId)) {
                query.productId = productId;
            }

            // Filter by change type
            if (changeType && ["increase", "decrease", "no_change"].includes(changeType)) {
                query.changeType = changeType;
            }

            // Filter by date range
            if (startDate && endDate) {
                query.changeDate = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }

            // Search by product name
            if (search) {
                const products = await Product.find({
                    name: { $regex: search, $options: "i" },
                }).select("_id");

                if (products.length > 0) {
                    query.productId = { $in: products.map((p) => p._id) };
                } else {
                    // No products found, return empty result
                    return res.status(200).json({
                        success: true,
                        data: [],
                        pagination: {
                            currentPage: parseInt(page),
                            totalPages: 0,
                            totalRecords: 0,
                            hasNext: false,
                            hasPrev: false,
                        },
                    });
                }
            }

            const priceHistory = await PriceHistory.find(query)
                .populate("productId", "name SKU images")
                .populate("changedBy", "fullName username")
                .populate("batchId", "batchCode")
                .sort({ changeDate: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await PriceHistory.countDocuments(query);

            res.status(200).json({
                success: true,
                data: priceHistory,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalRecords: total,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1,
                },
            });
        } catch (error) {
            console.error("Get all price history error:", error);
            res.status(500).json({
                success: false,
                message: "Lỗi khi lấy lịch sử thay đổi giá",
                error: error.message,
            });
        }
    },

    // Lấy lịch sử thay đổi giá theo sản phẩm
    getPriceHistoryByProduct: async (req, res) => {
        try {
            const { productId } = req.params;
            const { page = 1, limit = 20, unitName } = req.query;

            if (!isValidObjectId(productId)) {
                return res.status(400).json({
                    success: false,
                    message: "ID sản phẩm không hợp lệ",
                });
            }

            const query = { productId };
            if (unitName) {
                query.unitName = unitName;
            }

            const priceHistory = await PriceHistory.find(query)
                .populate("changedBy", "fullName username")
                .populate("batchId", "batchCode")
                .sort({ changeDate: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await PriceHistory.countDocuments(query);

            res.status(200).json({
                success: true,
                data: priceHistory,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalRecords: total,
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1,
                },
            });
        } catch (error) {
            console.error("Get price history by product error:", error);
            res.status(500).json({
                success: false,
                message: "Lỗi khi lấy lịch sử thay đổi giá theo sản phẩm",
                error: error.message,
            });
        }
    },

    // Lấy thống kê thay đổi giá
    getPriceChangeStatistics: async (req, res) => {
        try {
            const { startDate, endDate, productId } = req.query;

            const matchQuery = {};

            if (startDate && endDate) {
                matchQuery.changeDate = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }

            if (productId && isValidObjectId(productId)) {
                matchQuery.productId = new mongoose.Types.ObjectId(productId);
            }

            const statistics = await PriceHistory.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalChanges: { $sum: 1 },
                        priceIncreases: {
                            $sum: { $cond: [{ $eq: ["$changeType", "increase"] }, 1, 0] },
                        },
                        priceDecreases: {
                            $sum: { $cond: [{ $eq: ["$changeType", "decrease"] }, 1, 0] },
                        },
                        avgPriceChange: { $avg: "$priceChange" },
                        maxPriceIncrease: {
                            $max: {
                                $cond: [{ $eq: ["$changeType", "increase"] }, "$priceChange", 0],
                            },
                        },
                        maxPriceDecrease: {
                            $min: {
                                $cond: [{ $eq: ["$changeType", "decrease"] }, "$priceChange", 0],
                            },
                        },
                    },
                },
            ]);

            const monthlyTrends = await PriceHistory.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: {
                            year: { $year: "$changeDate" },
                            month: { $month: "$changeDate" },
                        },
                        totalChanges: { $sum: 1 },
                        avgChange: { $avg: "$priceChange" },
                        increases: {
                            $sum: { $cond: [{ $eq: ["$changeType", "increase"] }, 1, 0] },
                        },
                        decreases: {
                            $sum: { $cond: [{ $eq: ["$changeType", "decrease"] }, 1, 0] },
                        },
                    },
                },
                { $sort: { "_id.year": -1, "_id.month": -1 } },
                { $limit: 12 },
            ]);

            res.status(200).json({
                success: true,
                data: {
                    general: statistics[0] || {
                        totalChanges: 0,
                        priceIncreases: 0,
                        priceDecreases: 0,
                        avgPriceChange: 0,
                        maxPriceIncrease: 0,
                        maxPriceDecrease: 0,
                    },
                    monthlyTrends: monthlyTrends,
                },
            });
        } catch (error) {
            console.error("Get price change statistics error:", error);
            res.status(500).json({
                success: false,
                message: "Lỗi khi lấy thống kê thay đổi giá",
                error: error.message,
            });
        }
    },

    // Xóa lịch sử thay đổi giá (chỉ admin)
    deletePriceHistory: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return res.status(400).json({
                    success: false,
                    message: "ID lịch sử không hợp lệ",
                });
            }

            const deletedHistory = await PriceHistory.findByIdAndDelete(id);

            if (!deletedHistory) {
                return res.status(404).json({
                    success: false,
                    message: "Không tìm thấy lịch sử thay đổi giá",
                });
            }

            res.status(200).json({
                success: true,
                message: "Đã xóa lịch sử thay đổi giá thành công",
                data: deletedHistory,
            });
        } catch (error) {
            console.error("Delete price history error:", error);
            res.status(500).json({
                success: false,
                message: "Lỗi khi xóa lịch sử thay đổi giá",
                error: error.message,
            });
        }
    },
};

module.exports = priceHistoryController;
