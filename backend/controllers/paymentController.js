const PaymentService = require('../services/paymentService');
const Order = require('../models/Order');

const paymentController = {
    // Tạo thanh toán MoMo cá nhân
    createMoMoPayment: async (req, res) => {
        try {
            const { orderId, amount, orderInfo } = req.body;

            const momoResponse = await PaymentService.createMoMoPersonalQR(
                orderId,
                amount,
                orderInfo || `Thanh toán đơn hàng ${orderId}`
            );

            if (momoResponse.success) {
                // Lưu thông tin thanh toán vào database
                await Order.findByIdAndUpdate(orderId, {
                    paymentMethod: 'momo',
                    paymentStatus: 'paid'
                });

                res.status(200).json({
                    success: true,
                    qrCodeUrl: momoResponse.qrCodeUrl,
                    deeplink: momoResponse.deeplink,
                    paymentInfo: momoResponse.paymentInfo,
                    message: 'Tạo QR MoMo cá nhân thành công'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Lỗi khi tạo QR MoMo cá nhân'
                });
            }
        } catch (error) {
            console.error('Error creating MoMo personal payment:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi tạo thanh toán MoMo cá nhân',
                error: error.message
            });
        }
    },

    // Kiểm tra trạng thái thanh toán
    checkPaymentStatus: async (req, res) => {
        try {
            const { orderId } = req.params;

            const order = await Order.findById(orderId).select('paymentStatus paidAt transactionId');
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng'
                });
            }

            res.status(200).json({
                success: true,
                paymentStatus: order.paymentStatus,
                paidAt: order.paidAt,
                transactionId: order.transactionId
            });
        } catch (error) {
            console.error('Error checking payment status:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi kiểm tra trạng thái thanh toán'
            });
        }
    },

    // Xác nhận thanh toán thủ công (cho MoMo cá nhân)
    confirmManualPayment: async (req, res) => {
        try {
            const { orderId, transactionId, note } = req.body;

            const order = await Order.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng'
                });
            }

            if (order.paymentStatus === 'paid') {
                return res.status(400).json({
                    success: false,
                    message: 'Đơn hàng đã được thanh toán'
                });
            }

            await Order.findByIdAndUpdate(orderId, {
                paymentStatus: 'paid',
                paidAt: new Date(),
                transactionId: transactionId || `MANUAL_${Date.now()}`,
                paymentNote: note || 'Xác nhận thanh toán thủ công'
            });

            res.status(200).json({
                success: true,
                message: 'Xác nhận thanh toán thành công'
            });
        } catch (error) {
            console.error('Error confirming manual payment:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi xác nhận thanh toán'
            });
        }
    }
};

module.exports = paymentController;
