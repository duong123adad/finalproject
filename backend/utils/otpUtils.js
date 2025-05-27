const { sendVerificationEmail } = require('../config/nodemailer');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp, transporter) => {
  try {
    await sendVerificationEmail(email, otp);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Không thể gửi OTP');
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail
};