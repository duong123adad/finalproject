const mongoose = require('mongoose');

const salesOrderSchema = new mongoose.Schema({
    customerName: { type: String },
    orderDate: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true },
        batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }, // Nếu quản lý theo lô
        price: { type: Number }
    }],
    totalPrice: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
