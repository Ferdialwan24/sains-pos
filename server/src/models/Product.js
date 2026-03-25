import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    imageDataUrl: {
      type: String,
      default: null
    },
    trackInventory: {
      type: Boolean,
      default: false
    },
    inventoryQuantity: {
      type: Number,
      min: 0,
      default: 0
    },
    inventoryUnit: {
      type: String,
      enum: ['pcs', 'gr', 'ml', null],
      default: 'pcs'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

productSchema.index({ name: 1 }, { unique: true });

export const Product = mongoose.model('Product', productSchema);
