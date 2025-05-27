const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  company: {
    type: String,
    trim: true
  },
  taxId: {
    type: String,
    trim: true,
    uppercase: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  contact: {
    phone: {
      type: String,
      match: /^[0-9]{10,15}$/,
      trim: true
    },
    mobile: {
      type: String,
      match: /^[0-9]{10,15}$/,
      trim: true
    },
    email: {
      type: String,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      lowercase: true,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  primaryContactPerson: {
    name: String,
    position: String,
    phone: String,
    email: String
  },
  paymentTerms: {
    type: Number,
    default: 30,
    min: 0
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    branch: String,
    swiftCode: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    min: 0,
    max: 5
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  suppliedProducts: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

supplierSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'suppliers.supplier'
});

supplierSchema.index({ name: 'text', description: 'text', 'contact.email': 1 });
supplierSchema.index({ isActive: 1 });
supplierSchema.index({ rating: -1 });

module.exports = mongoose.model('Supplier', supplierSchema);