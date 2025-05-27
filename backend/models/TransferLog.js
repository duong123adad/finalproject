const mongoose = require('mongoose');

const transferLogSchema = new mongoose.Schema({
    batch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    fromLocation: {
        type: String,
        required: true,
        enum: ['warehouse', 'shelf']
    },
    toLocation: {
        type: String,
        required: true,
        enum: ['warehouse', 'shelf']
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    transferredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    notes: String,
    transferDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Indexes for query performance
transferLogSchema.index({ batch: 1 });
transferLogSchema.index({ product: 1 });
transferLogSchema.index({ transferDate: -1 });

module.exports = mongoose.model('TransferLog', transferLogSchema);
