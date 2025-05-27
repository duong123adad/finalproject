const mongoose = require("mongoose");

const goodReceiptItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: '{VALUE} is not an integer value'
    }
  },
  manufactureDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value <= new Date();
      },
      message: "Manufacture date cannot be in the future"
    }
  },
  expiryDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (value) {
        return value > this.manufactureDate;
      },
      message: "Expiry date must be after manufacture date"
    }
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch'
  },
  unit: {
    type: String,
    trim: true
  },
  quantity_unit: {
    type: Number
  },
  price: {
    type: Number
  },
  totalPrice: {
    type: Number
  }
});

const goodReceiptSchema = new mongoose.Schema({
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  receiptDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'received', 'partially_received', 'cancelled'],
    default: 'draft'
  },
  items: [goodReceiptItemSchema],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  totalAmount: {
    type: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

goodReceiptSchema.index({ purchaseOrder: 1 });
goodReceiptSchema.index({ supplier: 1 });
goodReceiptSchema.index({ receiptDate: -1 });
goodReceiptSchema.index({ status: 1 });
goodReceiptSchema.pre('save', async function (next) {
  if (this.isModified('status')) {
    if (this.status === 'received') {
      const Batch = mongoose.model('Batch');

      for (const item of this.items) {
        const batch = new Batch({
          product: item.product,
          supplier: this.supplier,
          manufacture_day: item.manufactureDate,
          expiry_day: item.expiryDate,
          initial_quantity: item.quantity,
          remaining_quantity: item.quantity,
          status: 'hoạt động',
          goodReceipt: this._id,
        });

        const savedBatch = await batch.save();
        item.batch = savedBatch._id;
      }
    }
  }
  next();
});

module.exports = mongoose.model('GoodReceipt', goodReceiptSchema);