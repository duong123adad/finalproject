const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: "{VALUE} is not an integer value",
    },
  },
  selectedBatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
  },
  unitPrice: {
    // Thêm trường này
    type: Number,
    required: true,
    min: 0,
  },
  selectedUnitName: {
    // Thêm trường này
    type: String,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "30d", // Cart will be automatically deleted after 30 days of inactivity
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
cartSchema.virtual("total").get(function () {
  return this.items.reduce((total, item) => {
    const unit = item.product?.units?.find(
      (u) => u.name === item.selectedUnitName
    );
    const price = unit ? unit.salePrice : 0;
    return total + item.quantity * price;
  }, 0);
});
// Ensure product exists and is active when adding to cart
cartSchema.pre("save", async function (next) {
  const Product = mongoose.model("Product");

  for (const item of this.items) {
    const product = await Product.findById(item.product);
    if (!product || !product.active) {
      throw new Error(`Product ${item.product} is not available`);
    }
  }

  next();
});

module.exports = mongoose.model("Cart", cartSchema);
