const mongoose = require("mongoose");
const ReturnReceipt = require("../models/ReturnReceipt");
const Batch = require("../models/Batch");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const axios = require("axios");
const { sendEmail } = require("../config/nodemailer");

// Helper function to update batch quantities via API
const updateBatchQuantities = async (batchId, updateData) => {
    try {
        // Use the full URL for the API call - may need to adjust based on your environment
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:8000/api';

        const response = await axios.put(`${apiUrl}/batches/${batchId}`, updateData);
        return response.data;
    } catch (error) {
        console.error("Error updating batch via API:", error);
        throw new Error(error.response?.data?.message || error.message || "Failed to update batch");
    }
};

const sendReturnReceiptEmail = async (toEmail, receipt) => {
    try {
        const subject = `Thông báo phiếu ${receipt.type === "return" ? "trả hàng" : "đổi hàng"} #${receipt.returnNumber}`;
        const html = `
            <p>Kính gửi quý đối tác,</p>
            <p>Chúng tôi xin thông báo về phiếu ${receipt.type === "return" ? "trả hàng" : "đổi hàng"} mới. Chi tiết phiếu như sau:</p>
            <table>
                <tr>
                    <td><strong>Mã phiếu:</strong></td>
                    <td>${receipt.returnNumber}</td>
                </tr>
                <tr>
                    <td><strong>Ngày tạo:</strong></td>
                    <td>${new Date(receipt.createdAt).toLocaleDateString()}</td>
                </tr>
                <tr>
                    <td><strong>Sản phẩm:</strong></td>
                    <td>${receipt.productId?.name || "Không xác định"}</td> <!-- Ensure product name is included -->
                </tr>
                <tr>
                    <td><strong>Số lượng:</strong></td>
                    <td>${receipt.quantity}</td>
                </tr>
                <tr>
                    <td><strong>Lý do:</strong></td>
                    <td>${receipt.reason}</td>
                </tr>
            </table>
            <p>Xin chân thành cảm ơn sự hợp tác của quý vị.</p>
            <p>Trân trọng,</p>
            <p>Phòng quản lý kho</p>
        `;

        await sendEmail({ to: toEmail, subject, html });
        console.log(`Đã gửi email phiếu ${receipt.type} đến: ${toEmail}`);
    } catch (error) {
        console.error("Lỗi khi gửi email phiếu đổi trả hàng:", error);
    }
};

const returnController = {
    createReturn: async (req, res) => {
        try {
            const { batchId, supplierId, quantity, reason, returnDate, productId, notes, type } = req.body;

            // Validate inputs
            if (!batchId || !supplierId || !quantity || !reason || !productId) {
                return res.status(400).json({ message: "Vui lòng cung cấp đầy đủ thông tin" });
            }

            // Find batch to check availability
            const batch = await Batch.findById(batchId);
            if (!batch) {
                return res.status(404).json({ message: "Không tìm thấy lô hàng" });
            }

            // Validate quantity
            const totalAvailableQuantity = batch.remaining_quantity + batch.quantity_on_shelf;
            if (quantity > totalAvailableQuantity) {
                return res.status(400).json({
                    message: `Số lượng trả (${quantity}) vượt quá số lượng hiện có (${totalAvailableQuantity})`
                });
            }

            // Find product and supplier for email information
            const product = await Product.findById(productId);
            const supplier = await Supplier.findById(supplierId);

            // Create return receipt
            const returnReceipt = new ReturnReceipt({
                batchId,
                supplierId,
                productId,
                quantity,
                reason,
                returnDate: returnDate || new Date(),
                createdBy: req.user ? req.user._id : null,
                notes,
                type: type || "return",
                productName: product ? product.name : null // Ensure product name is included
            });

            await returnReceipt.save();

            // If type is "return" AND status is "completed", update batch quantities immediately
            // Default status is now "pending" so this won't execute normally on creation
            if (returnReceipt.type === "return" && returnReceipt.status === "completed") {
                try {
                    // Calculate how much to reduce from each location
                    let warehouseReduction = Math.min(batch.remaining_quantity, quantity);
                    let shelfReduction = 0;

                    if (warehouseReduction < quantity) {
                        // Need to take some from shelf too
                        shelfReduction = quantity - warehouseReduction;
                    }

                    // Update batch via API
                    await updateBatchQuantities(batchId, {
                        remaining_quantity: batch.remaining_quantity - warehouseReduction,
                        quantity_on_shelf: batch.quantity_on_shelf - shelfReduction,
                        // Update status if needed
                        status: (batch.remaining_quantity - warehouseReduction <= 0 &&
                            batch.quantity_on_shelf - shelfReduction <= 0) ? 'hết hàng' : batch.status
                    });
                } catch (error) {
                    // If batch update fails, delete the return receipt and return an error
                    await ReturnReceipt.findByIdAndDelete(returnReceipt._id);
                    return res.status(500).json({
                        message: "Không thể cập nhật số lượng lô hàng",
                        error: error.message
                    });
                }
            }

            // Send email notification to supplier
            if (supplier && supplier.contact && supplier.contact.email) {
                const populatedReceipt = await ReturnReceipt.findById(returnReceipt._id)
                    .populate('productId', 'name'); // Populate product name for email
                sendReturnReceiptEmail(supplier.contact.email, populatedReceipt);
            }

            // Return response with populated data
            const populatedReturn = await ReturnReceipt.findById(returnReceipt._id)
                .populate('batchId')
                .populate('productId', 'name SKU')
                .populate('supplierId', 'name email')
                .populate('createdBy', 'username fullName');

            res.status(201).json(populatedReturn);

        } catch (error) {
            console.error("Lỗi khi tạo phiếu trả hàng:", error);
            res.status(500).json({
                message: "Đã xảy ra lỗi khi tạo phiếu trả hàng",
                error: error.message
            });
        }
    },

    getAllReturns: async (req, res) => {
        try {
            const query = {};

            // Apply filters if provided
            if (req.query.supplierId) query.supplierId = req.query.supplierId;
            if (req.query.productId) query.productId = req.query.productId;
            if (req.query.batchId) query.batchId = req.query.batchId;
            if (req.query.status) query.status = req.query.status;
            if (req.query.type) query.type = req.query.type; // Add filter for type parameter

            // Date range filter
            if (req.query.startDate && req.query.endDate) {
                query.returnDate = {
                    $gte: new Date(req.query.startDate),
                    $lte: new Date(req.query.endDate)
                };
            }

            const returns = await ReturnReceipt.find(query)
                .populate('batchId')
                .populate('productId', 'name SKU') // Ensure product name is populated
                .populate('supplierId', 'name')
                .populate('createdBy', 'username fullName')
                .sort({ createdAt: -1 }); // Changed from returnDate to createdAt for newest-first

            res.json(returns);

        } catch (error) {
            console.error("Lỗi khi lấy danh sách phiếu trả hàng:", error);
            res.status(500).json({
                message: "Đã xảy ra lỗi khi lấy danh sách phiếu trả hàng",
                error: error.message
            });
        }
    },

    getReturnById: async (req, res) => {
        try {
            const returnReceipt = await ReturnReceipt.findById(req.params.id)
                .populate('batchId')
                .populate('productId', 'name SKU images') // Ensure product name is populated
                .populate('supplierId', 'name contact')
                .populate('createdBy', 'username fullName');

            if (!returnReceipt) {
                return res.status(404).json({ message: "Không tìm thấy phiếu trả hàng" });
            }

            res.json(returnReceipt);
        } catch (error) {
            console.error("Lỗi khi lấy chi tiết phiếu trả hàng:", error);
            res.status(500).json({
                message: "Đã xảy ra lỗi khi lấy chi tiết phiếu trả hàng",
                error: error.message
            });
        }
    },

    updateReturnStatus: async (req, res) => {
        try {
            const { status } = req.body;
            const returnId = req.params.id;

            if (!['pending', 'completed', 'cancelled'].includes(status)) {
                return res.status(400).json({ message: "Trạng thái không hợp lệ" });
            }

            const returnReceipt = await ReturnReceipt.findById(returnId)
                .populate('supplierId')
                .populate('batchId');

            if (!returnReceipt) {
                return res.status(404).json({ message: "Không tìm thấy phiếu trả hàng" });
            }

            // Handle status change based on receipt type
            if (status === 'completed' && returnReceipt.status === 'pending') {
                // For return type, update quantities only if the receipt type is "return"
                if (returnReceipt.type === 'return') {
                    const batch = returnReceipt.batchId;

                    if (batch) {
                        try {
                            // Calculate how much to reduce from each location
                            let warehouseReduction = Math.min(batch.remaining_quantity, returnReceipt.quantity);
                            let shelfReduction = 0;

                            if (warehouseReduction < returnReceipt.quantity) {
                                // Need to take some from shelf too
                                shelfReduction = returnReceipt.quantity - warehouseReduction;
                            }

                            // Update batch via API
                            await updateBatchQuantities(batch._id, {
                                remaining_quantity: batch.remaining_quantity - warehouseReduction,
                                quantity_on_shelf: batch.quantity_on_shelf - shelfReduction,
                                // Update status if needed
                                status: (batch.remaining_quantity - warehouseReduction <= 0 &&
                                    batch.quantity_on_shelf - shelfReduction <= 0) ? 'hết hàng' : batch.status
                            });
                        } catch (error) {
                            return res.status(500).json({
                                message: "Không thể cập nhật số lượng lô hàng",
                                error: error.message
                            });
                        }
                    }
                }
                // For exchange type, no batch quantity changes needed

                // Update return receipt status
                returnReceipt.status = status;
                await returnReceipt.save();

                // Send email notification about status update
                const supplier = returnReceipt.supplierId;
                if (supplier && supplier.email) {
                    const typeText = returnReceipt.type === "return" ? "trả hàng" : "đổi hàng";

                    const mailOptions = {
                        from: process.env.EMAIL_USER || "youremail@gmail.com",
                        to: supplier.email,
                        subject: `Cập nhật phiếu ${typeText} #${returnReceipt.returnNumber || returnReceipt._id}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>Cập nhật trạng thái phiếu ${typeText}</h2>
                                <p>Kính gửi ${supplier.name},</p>
                                <p>Phiếu ${typeText} với mã ${returnReceipt.returnNumber || returnReceipt._id} đã được cập nhật trạng thái thành <strong>Hoàn thành</strong>.</p>
                                <p>Vui lòng liên hệ với chúng tôi nếu cần thêm thông tin.</p>
                                <p>Trân trọng,<br/>Đội ngũ quản lý cửa hàng</p>
                            </div>
                        `
                    };

                    transporter.sendMail(mailOptions)
                        .catch(err => console.error("Failed to send status update email:", err));
                }
            }
            // Handle cancellation (similar to previous implementation)
            else if (status === 'cancelled') {
                // If cancelling a completed return, restore the quantities for return type
                if (returnReceipt.status === 'completed' && returnReceipt.type === 'return') {
                    const batch = returnReceipt.batchId;

                    if (batch) {
                        try {
                            // Update batch via API - restore all quantity to the warehouse
                            await updateBatchQuantities(batch._id, {
                                remaining_quantity: batch.remaining_quantity + returnReceipt.quantity,
                                // Update status if needed
                                status: 'hoạt động'
                            });
                        } catch (error) {
                            return res.status(500).json({
                                message: "Không thể khôi phục số lượng lô hàng",
                                error: error.message
                            });
                        }
                    }
                }

                // Update return receipt status
                returnReceipt.status = status;
                await returnReceipt.save();

                // Send cancellation email
                const supplier = returnReceipt.supplierId;
                if (supplier && supplier.email) {
                    const typeText = returnReceipt.type === "return" ? "trả hàng" : "đổi hàng";

                    const mailOptions = {
                        from: process.env.EMAIL_USER || "youremail@gmail.com",
                        to: supplier.email,
                        subject: `Hủy phiếu ${typeText} #${returnReceipt.returnNumber || returnReceipt._id}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; padding: 20px;">
                                <h2>Thông báo hủy phiếu ${typeText}</h2>
                                <p>Kính gửi ${supplier.name},</p>
                                <p>Phiếu ${typeText} với mã ${returnReceipt.returnNumber || returnReceipt._id} đã bị hủy.</p>
                                <p>Vui lòng liên hệ với chúng tôi nếu cần thêm thông tin.</p>
                                <p>Trân trọng,<br/>Đội ngũ quản lý cửa hàng</p>
                            </div>
                        `
                    };

                    transporter.sendMail(mailOptions)
                        .catch(err => console.error("Failed to send cancellation email:", err));
                }
            } else {
                // Simple status update for other cases
                returnReceipt.status = status;
                await returnReceipt.save();
            }

            const updatedReturn = await ReturnReceipt.findById(req.params.id)
                .populate('batchId')
                .populate('productId', 'name SKU')
                .populate('supplierId', 'name email')
                .populate('createdBy', 'username fullName');

            res.json(updatedReturn);

        } catch (error) {
            console.error("Lỗi khi cập nhật trạng thái phiếu trả hàng:", error);
            res.status(500).json({
                message: "Đã xảy ra lỗi khi cập nhật trạng thái phiếu trả hàng",
                error: error.message
            });
        }
    },

    getReturnStatistics: async (req, res) => {
        try {
            // Default period is last 30 days if not specified
            const startDate = req.query.startDate
                ? new Date(req.query.startDate)
                : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            const endDate = req.query.endDate
                ? new Date(req.query.endDate)
                : new Date();

            // Aggregate statistics
            const statistics = await ReturnReceipt.aggregate([
                {
                    $match: {
                        returnDate: { $gte: startDate, $lte: endDate },
                        status: 'completed'
                    }
                },
                {
                    $group: {
                        _id: "$supplierId",
                        totalQuantity: { $sum: "$quantity" },
                        returnCount: { $sum: 1 },
                        products: { $addToSet: "$productId" }
                    }
                },
                {
                    $lookup: {
                        from: "suppliers",
                        localField: "_id",
                        foreignField: "_id",
                        as: "supplier"
                    }
                },
                {
                    $unwind: {
                        path: "$supplier",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $project: {
                        supplierId: "$_id",
                        supplierName: "$supplier.name",
                        totalQuantity: 1,
                        returnCount: 1,
                        uniqueProductCount: { $size: "$products" }
                    }
                }
            ]);

            res.json({
                period: { startDate, endDate },
                statistics
            });

        } catch (error) {
            console.error("Lỗi khi lấy thống kê trả hàng:", error);
            res.status(500).json({
                message: "Đã xảy ra lỗi khi lấy thống kê trả hàng",
                error: error.message
            });
        }
    },

    resendReturnEmail: async (req, res) => {
        try {
            const returnId = req.params.id;

            const returnReceipt = await ReturnReceipt.findById(returnId)
                .populate('supplierId', 'name contact')
                .populate('productId', 'name'); // Populate product name for email

            if (!returnReceipt) {
                return res.status(404).json({ message: "Không tìm thấy phiếu trả hàng" });
            }

            const supplier = returnReceipt.supplierId;
            if (!supplier || !supplier.contact || !supplier.contact.email) {
                return res.status(400).json({ message: "Không tìm thấy email của nhà cung cấp" });
            }

            await sendReturnReceiptEmail(supplier.contact.email, returnReceipt);
            res.status(200).json({ message: "Email đã được gửi lại thành công" });
        } catch (error) {
            console.error("Lỗi khi gửi lại email phiếu trả hàng:", error);
            res.status(500).json({ message: "Lỗi khi gửi lại email phiếu trả hàng", error: error.message });
        }
    }
};

module.exports = returnController;
