const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const authRouter = require('./routers/authRouter');
const productRouter = require('./routers/productRouter');
const categoryRouter = require('./routers/categoryRouter');
const batchRouter = require('./routers/batchRouter');
const supplierRouter = require('./routers/supplierRouter');
const purchaseOrderRouter = require('./routers/purchaseOrderRouter');
const goodReceiptRouter = require('./routers/goodReceiptRouter');
const userRouter = require('./routers/userRouter');
const cartRouter = require('./routers/cartRouter');
const orderRouter = require('./routers/orderRouter');
const returnRouter = require('./routers/returnRouter');
const PriceHistory = require('./routers/priceHistoryRoutes');
const session = require('express-session');
const paymentRoutes = require('./routers/paymentRouter');


dotenv.config();

const app = express();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("Kết nối MongoDB thành công!");
    } catch (error) {
        console.error("Lỗi kết nối MongoDB:", error.message);
        process.exit(1); // Thoát chương trình nếu kết nối thất bại
    }
};

connectDB();

app.use(cors({
    origin: ["http://localhost:3001", "http://localhost:8000"],
    credentials: true,
}));


app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key', // Thay bằng secret key mạnh của bạn
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Đặt thành true nếu dùng HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 giờ
    }
}));

app.use(express.json());

app.listen(8000, () => {
    console.log('Server is running on port 8000');
});

//Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/products', productRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/batches', batchRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/purchaseOrder', purchaseOrderRouter);
app.use('/api/goodReceipt', goodReceiptRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/returns', returnRouter);
app.use('/api/priceHistory', PriceHistory);
app.use('/api/payment', paymentRoutes);
