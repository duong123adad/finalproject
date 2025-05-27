const mongoose = require('mongoose');

const discountCampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed_amount'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(value) {
        if (this.discountType === 'percentage' && value > 100) {
          return false;
        }
        return true;
      },
      message: 'Percentage discount cannot exceed 100%'
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  targetType: {
    type: String,
    enum: ['all_products', 'specific_products', 'near_expiry', 'specific_categories'],
    required: true
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  daysBeforeExpiry: {
    type: Number,
    min: 1,
    required: function() {
      return this.targetType === 'near_expiry';
    }
  },
  minDiscountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  maxDiscountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    validate: {
      validator: function(value) {
        return value >= (this.minDiscountPercentage || 0);
      },
      message: 'Max discount must be greater than or equal to min discount'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applyAutomatically: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Middleware to auto-apply discount to batches when campaign is active
discountCampaignSchema.pre('save', async function(next) {
  if (this.isActive && this.applyAutomatically) {
    const Batch = mongoose.model('Batch');
    const Product = mongoose.model('Product');
    
    let query = { status: 'active' };
    
    if (this.targetType === 'near_expiry') {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + this.daysBeforeExpiry);
      query.expiry_day = { $lte: expiryDate, $gte: new Date() };
    } else if (this.targetType === 'specific_products' && this.products.length > 0) {
      query.product = { $in: this.products };
    } else if (this.targetType === 'specific_categories' && this.categories.length > 0) {
      const products = await Product.find({ category: { $in: this.categories } }).select('_id');
      query.product = { $in: products.map(p => p._id) };
    }
    
    const batches = await Batch.find(query);
    
    for (const batch of batches) {
      const shouldApplyDiscount = (
        !batch.discountInfo.isDiscounted || 
        (this.discountType === 'percentage' && 
         this.discountValue > (batch.discountInfo.discountValue || 0))
      );
      
      if (shouldApplyDiscount) {
        batch.discountInfo = {
          isDiscounted: true,
          discountType: this.discountType,
          discountValue: this.discountValue,
          discountStartDate: this.startDate,
          discountEndDate: this.endDate,
          discountReason: 'campaign'
        };
        
        await batch.save();
      }
    }
  }
  next();
});

// Indexes
discountCampaignSchema.index({ startDate: 1, endDate: 1 });
discountCampaignSchema.index({ isActive: 1 });
discountCampaignSchema.index({ targetType: 1 });

module.exports = mongoose.model('DiscountCampaign', discountCampaignSchema);