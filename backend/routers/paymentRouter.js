const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Tạo thanh toán MoMo
router.post('/momo/create', paymentController.createMoMoPayment);

// Xác nhận thanh toán thủ công (cho MoMo cá nhân)
router.post('/confirm-manual', paymentController.confirmManualPayment);

// Kiểm tra trạng thái thanh toán
router.get('/status/:orderId', paymentController.checkPaymentStatus);

module.exports = router;
