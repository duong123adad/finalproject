const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'vtduonglamdong@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'amugzmefiupkjurw',
  },
});

// Kiểm tra kết nối khi khởi động
transporter.verify()
  .then(() => console.log('SMTP connection verified'))
  .catch(err => console.error('SMTP connection error:', err));

const sendEmail = async (mailOptions) => {
  try {
    if (!mailOptions.to || !mailOptions.subject || !mailOptions.html) {
      throw new Error('Missing required email parameters');
    }
    
    mailOptions.from = mailOptions.from || `"Your App" <${process.env.EMAIL_USER}>`;
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Hàm gửi email xác nhận với OTP
const sendVerificationEmail = async (email, verificationCode) => {
  try {
    if (!email || !verificationCode) {
      throw new Error('Missing email or verification code');
    }
    
    const subject = 'Xác nhận đăng ký tài khoản';
    const html = `<p>Mã xác nhận của bạn là: <strong>${verificationCode}</strong></p>
                 <p>Mã này sẽ hết hạn sau 5 phút.</p>`;
    
    return await sendEmail({  // Thay đổi từ sendMail thành sendEmail
      to: email,
      subject: subject,
      html: html
    });
  } catch (error) {
    console.error('Error in sendVerificationEmail:', error);
    throw error;
  }
};

module.exports = {
  transporter,
  sendEmail,
  sendVerificationEmail
};