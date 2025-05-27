const crypto = require('crypto');
const axios = require('axios');
const QRCode = require('qrcode');

class PaymentService {
    constructor() {
        // Cấu hình cho MoMo cá nhân
        this.momo = {
            phoneNumber: process.env.MOMO_PHONE_NUMBER || 'chưa tìm thấy', // Số điện thoại MoMo của bạn
            fullName: process.env.MOMO_FULL_NAME || 'chưa tìm thấy', // Tên chủ tài khoản MoMo
        };
    }

    // Tạo QR code MoMo cá nhân
    async createMoMoPersonalQR(orderId, amount, orderInfo) {
        try {
            // Tạo nội dung chuyển khoản MoMo
            const transferContent = `${orderInfo} - ${orderId}`;

            // Tạo deep link MoMo cho chuyển khoản cá nhân
            const momoDeeplink = `momo://transfer?phone=${this.momo.phoneNumber}&amount=${amount}&note=${encodeURIComponent(transferContent)}`;

            // Tạo QR code từ deep link
            const qrCodeDataURL = await QRCode.toDataURL(momoDeeplink, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            return {
                success: true,
                qrCodeUrl: qrCodeDataURL,
                deeplink: momoDeeplink,
                paymentInfo: {
                    phoneNumber: this.momo.phoneNumber,
                    fullName: this.momo.fullName,
                    amount: amount,
                    content: transferContent,
                    orderId: orderId
                }
            };
        } catch (error) {
            throw new Error(`MoMo Personal QR Error: ${error.message}`);
        }
    }
}

module.exports = new PaymentService();
